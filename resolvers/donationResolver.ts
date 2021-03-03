import {
  Resolver,
  Query,
  Arg,
  Mutation,
  Ctx
} from 'type-graphql'
import config from '../config'
import Logger from '../logger'
import chalk = require('chalk')
import { getTokenPrices, getOurTokenList } from '../uniswap'
import axios, { AxiosResponse } from 'axios'

import { MyContext } from '../types/MyContext'
import { Repository, In } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { User } from '../entities/user'
import { Project } from '../entities/project'
import { Donation } from '../entities/donation'
import { Token } from '../entities/token'
import { web3 } from '../utils/web3'
import { Wallet } from '../entities/wallet';

@Resolver(of => User)
export class DonationResolver {
  constructor (
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  @Query(returns => [Donation], { nullable: true })
   async donations () {
    const donation = await this.donationRepository.find()
    
    return donation
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets (
    @Ctx() ctx: MyContext,
    @Arg('fromWalletAddresses', type => [String]) fromWalletAddresses: string[]) {
    
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o => o.toLowerCase())
    
    const donations = await this.donationRepository.find({ 
      where: {
        fromWalletAddress: In(fromWalletAddressesArray )
      }
    })
    return donations
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets (
    @Ctx() ctx: MyContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[]) {
    
    const toWalletAddressesArray: string[] = toWalletAddresses.map(o => o.toLowerCase())
    
    const donations = await this.donationRepository.find({ 
      where: {
        toWalletAddress: In(toWalletAddressesArray )
      }
    })
    return donations
  }

  @Query(returns => [Token], { nullable: true })
  async tokens () {
    
    return getOurTokenList()
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsByDonor (@Ctx() ctx: MyContext) {
    if (!ctx.req.user) throw new Error("You must be logged in in order to register project donations");
    const userId = ctx.req.user.userId
    
    const donations = await this.donationRepository.find({ 
      where: {
        user: userId
      }
    })
    
    return donations
  }

  @Mutation(returns => Number)
  async saveDonation (
    @Arg('fromAddress') fromAddress: string,
    @Arg('toAddress') toAddress: string,
    @Arg('amount') amount: Number,
    @Arg('transactionId') transactionId: string,
    @Arg('transactionNetworkId') transactionNetworkId: Number,
    @Arg('token') token: string,
    @Arg('projectId') projectId: Number,
    @Arg('chainId') chainId: Number,
    @Ctx() ctx: MyContext
  ): Promise<Number> {
    try {
      let userId
      if(!chainId) chainId = 1
      let originUser;
      
      //Logged in
      if(ctx.req.user && ctx.req.user.userId) {    
        userId = ctx.req.user.userId
        originUser = await User.findOne({ id: userId })
        
        if(!originUser) throw Error(`The logged in user doesn't exist - id ${userId}`)
        //Transaction not made with the users primary wallet
            
      } 
      const project = await Project.findOne({ id: Number(projectId) });
      
      if(!project) throw new Error("Transaction project was not found.");
    
      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionId.toString().toLowerCase(),
        transactionNetworkId: Number(transactionNetworkId),
        currency: token, 
        user: (userId ? originUser  : null),
        project: project,
        createdAt: new Date(),
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        anonymous: !!userId
      })
      await donation.save()
      
      getTokenPrices(token, ['USDT', 'ETH'], Number(chainId)).then(async (prices: number[]) => {
        
        donation.valueUsd = Number(amount) * Number(prices[0])
        donation.valueEth = Number(amount) * Number(prices[1])
        
        donation.priceUsd = Number(prices[0])
        donation.priceEth = Number(prices[1])
        
        await donation.save()
        
      }).catch(e => {
        throw new Error (e)
      })


      return donation.id

    } catch (e) {
      Logger.captureException(e);
      console.error(e)
      throw new Error(e)

    }
  
  }

  @Mutation(returns => Boolean)
  async saveDonationTransaction (
    @Arg('transactionId') transactionId: string,
    @Arg('donationId') donationId: Number,
    @Ctx() ctx: MyContext
  ): Promise<Boolean> {

    try {
      const txInfo = await web3.eth.getTransaction(transactionId);

      if (!txInfo) Logger.captureMessage(`Transaction ID ${transactionId} not found.`);
      const destinationProject = await Project.findOne({ walletAddress: txInfo.to?.toString() || "" });
      
      let userId
      
      let originUser;
      
      //Logged in
      if(ctx.req.user && ctx.req.user.userId) {    
        userId = ctx.req.user.userId
        originUser = await User.findOne({ id: userId })
        
        if(!originUser) throw Error(`No user with user id of ${userId} found this should not happen. TransactionID ${transactionId} `)
        //Transaction not made with the users primary wallet
        if(originUser && originUser.walletAddress !== txInfo.from) {
          const donation = await Wallet.create({
            user: originUser,
            address: txInfo.from.toLowerCase()
          })
        }     
      } else {
        originUser = await User.findOne({ walletAddress: txInfo.from })
        
        userId = originUser ? originUser.id : null
      }
    
      if(!destinationProject) throw new Error("Transaction project was not found.");
      
      const value = txInfo.value ? Number(web3.utils.fromWei(txInfo.value)) : 0 
      
      const donation = await Donation.findOne({ id: Number(donationId) })
      if(!donation) throw new Error(`Donation not found by Id ${donationId}`);
      
      donation.transactionId = transactionId
      
      const feathersServer = (config.get('ETHEREUM_NETWORK') === 'ropsten') ? 'develop' : 'beta' // live is beta
      const feathersUrl: string = `https://feathers.${feathersServer}.giveth.io/conversionRates?txHash=${transactionId}&from=ETH&isHome=true`
      
      let valueUsd = 0
      axios.get(feathersUrl).then(response => {
        valueUsd = response.data.rate * Number(value)
        donation.valueUsd = valueUsd
        donation.save()
        console.log('Saved Feathers response')
      })

      return true
    } catch (e) {
      //Log the error 
      Logger.captureException(e);
      // Logger.captureMessage(`Error calling feathers for transaction - ${feathersUrl}`);
      throw new Error(`Error saving donation`)
      
    }
    
    
    
  }

}
