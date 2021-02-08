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

import axios, { AxiosResponse } from 'axios'

import { MyContext } from '../types/MyContext'
import { Repository, In } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { User } from '../entities/user'
import { Project } from '../entities/project'
import { Donation } from '../entities/donation'
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

  @Mutation(returns => Boolean)
  async saveDonation (
    @Arg('transactionId') transactionId: string,
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
      
      const donation = await Donation.create({
        amount: Number(value),
        currency: 'ETH', 
        user: (userId ? originUser  : null),
        project: destinationProject,
        createdAt: new Date(),
        transactionId: transactionId,
        toWalletAddress: txInfo.to?.toString().toLowerCase(),
        fromWalletAddress: txInfo.from?.toString().toLowerCase(),
        anonymous: !!userId
      })
      
      //0xf1d564c9890cd8f80455d761ee4ea1e69829f777bd4b0f127fa7ada6d0e8df32
      const feathersServer = (config.get('ETHEREUM_NETWORK') === 'ropsten') ? 'develop' : 'beta' // live is beta
      const feathersUrl: string = `https://feathers.${feathersServer}.giveth.io/conversionRates?txHash=${transactionId}&from=ETH&isHome=true`
      
      let valueUsd = 0
      const response: any = await axios.get(feathersUrl)
     
      valueUsd = response.data.rate * Number(value) 
       
      donation.valueUsd = valueUsd
      donation.save()

    } catch (e) {
      //Log the error 
      Logger.captureException(e);
      // Logger.captureMessage(`Error calling feathers for transaction - ${feathersUrl}`);
      throw new Error(`Error saving donation`)
    }
    
    
    return true
  }

}
