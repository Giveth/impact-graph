import { Resolver, Query, Arg, Mutation, Ctx } from 'type-graphql'
import { InjectRepository } from 'typeorm-typedi-extensions'
//import { getTokenPrices, getOurTokenList } from '../uniswap'
import { getTokenPrices, getOurTokenList } from 'monoswap'
import { Donation } from '../entities/donation'
import { getProviderFromChainId } from '../provider'
import { MyContext } from '../types/MyContext'
import { Project } from '../entities/project'
import axios, { AxiosResponse } from 'axios'
import { getAnalytics } from '../analytics'
import { Wallet } from '../entities/wallet'
import { Token } from '../entities/token'
import { Repository, In } from 'typeorm'
import { User } from '../entities/user'
import { web3 } from '../utils/web3'
import config from '../config'
import Logger from '../logger'
import chalk = require('chalk')

const analytics = getAnalytics()

@Resolver(of => User)
export class DonationResolver {
  constructor (
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>
  ) {}

  @Query(returns => [Donation], { nullable: true })
  async donations () {
    const donation = await this.donationRepository.find()

    return donation
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets (
    @Ctx() ctx: MyContext,
    @Arg('fromWalletAddresses', type => [String]) fromWalletAddresses: string[]
  ) {
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o =>
      o.toLowerCase()
    )

    const donations = await this.donationRepository.find({
      where: {
        fromWalletAddress: In(fromWalletAddressesArray)
      }
    })
    return donations
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets (
    @Ctx() ctx: MyContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[]
  ) {
    const toWalletAddressesArray: string[] = toWalletAddresses.map(o =>
      o.toLowerCase()
    )

    const donations = await this.donationRepository.find({
      where: {
        toWalletAddress: In(toWalletAddressesArray)
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
    if (!ctx.req.user)
      throw new Error(
        'You must be logged in in order to register project donations'
      )
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
      if (!chainId) chainId = 1
      const priceChainId = chainId === 3 ? 1 : chainId
      let originUser

      //Logged in
      if (ctx.req.user && ctx.req.user.userId) {
        userId = ctx.req.user.userId
        originUser = await User.findOne({ id: userId })
        analytics.identifyUser(originUser)

        if (!originUser)
          throw Error(`The logged in user doesn't exist - id ${userId}`)
        //Transaction not made with the users primary wallet
      }
      const project = await Project.findOne({ id: Number(projectId) })

      if (!project) throw new Error('Transaction project was not found.')

      const user = userId ? originUser : null
      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionId.toString().toLowerCase(),
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        user,
        project: project,
        createdAt: new Date(),
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        anonymous: !!userId
      })
      await donation.save()

      const analyticsUserId = userId ? originUser.segmentUserId() : null
      const anonymousId = !analyticsUserId
        ? fromAddress.toString().toLowerCase()
        : null

      const baseTokens =
        Number(priceChainId) === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH']

      const segmentDonation = {
        email: (user != null) ? user.email : "",
        donorFirstName: (user != null) ? user.firstName : "",
        projectOwnerEmail: project.users[0].email,
        title: project.title,
        projectCreatorLastName: project.users[0].lastName,
        projectCreatorFirstName: project.users[0].firstName,
        projectOwnerId: project.admin,
        slug: project.slug,
        projectWalletAddress: project.walletAddress,
        amount: Number(amount),
        transactionId: transactionId.toString().toLowerCase(),
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        createdAt: new Date(),
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        anonymous: !!userId
      }
      analytics.track(
        'Made donation',
        analyticsUserId,
        segmentDonation,
        anonymousId
      )
      getTokenPrices(token, baseTokens, Number(priceChainId))
        .then(async (prices: number[]) => {
          //console.log(`prices : ${JSON.stringify(prices, null, 2)}`)

          donation.priceUsd = Number(prices[0])
          donation.priceEth = Number(prices[1])

          donation.valueUsd = Number(amount) * donation.priceUsd
          donation.valueEth = Number(amount) * donation.priceEth

          await donation.save()
        })
        .catch(e => {
          throw new Error(e)
        })

      return donation.id
    } catch (e) {
      Logger.captureException(e)
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
    return true
    //This end point is to be removed
    // try {
    //   const donation = await Donation.findOne({ id: Number(donationId) })
    //   if (!donation) throw new Error(`Donation not found by Id ${donationId}`)

    //   const chainId =
    //     donation.transactionNetworkId === 3 ? 1 : donation.transactionNetworkId
    //   console.log(`chainID ---> : ${chainId}`)
    //   const provider = getProviderFromChainId(chainId)
    //   console.log(`transactionId ---> : ${transactionId}`)
    //   //const txInfo = await provider.eth.getTransaction(transactionId)
    //   const txInfo = await web3.eth.getTransaction(transactionId)
    //   //config.get('ETHEREUM_NETWORK')
    //   console.log(`txInfo : ${JSON.stringify(txInfo, null, 2)}`)

    //   //const txInfo = await web3.eth.getTransaction(transactionId)

    //   if (!txInfo)
    //     Logger.captureMessage(`Transaction ID ${transactionId} not found.`)

    //   let userId

    //   let originUser

    //   console.log(`ctx.req.user.userId ---> : ${ctx.req.user.userId}`)
    //   //Logged in
    //   if (ctx.req.user && ctx.req.user.userId) {
    //     userId = ctx.req.user.userId
    //     originUser = await User.findOne({ id: userId })

    //     console.log(`originUser : ${JSON.stringify(originUser, null, 2)}`)

    //     if (!originUser)
    //       throw Error(
    //         `No user with user id of ${userId} found this should not happen. TransactionID ${transactionId} `
    //       )

    //     console.log(
    //       `originUser.walletAddress ---> : ${originUser.walletAddress}`
    //     )
    //     console.log(`xxx txInfo.from ---> : ${txInfo.from}`)
    //     console.log(`donation   from ---> : ${donation.fromWalletAddress}`)
    //     //Transaction not made with the users primary wallet
    //     if (originUser && originUser.walletAddress !== txInfo.from) {
    //       console.log('ARE HERE', userId)

    //       const originUserWallet = await Wallet.findOne({ userId: userId })
    //       console.log(`originUserWallet111 ---> : ${originUserWallet}`)
    //       if (!originUserWallet) {
    //         console.log('Save new wallet for user')

    //         const wallet = await Wallet.create({
    //           user: originUser,
    //           address: txInfo.from.toLowerCase()
    //         })
    //         console.log(`wallet : ${JSON.stringify(wallet, null, 2)}`)
    //         wallet.save()
    //       } else {
    //         console.log('User wallet exists')
    //       }
    //     }
    //   } else {
    //     originUser = await User.findOne({ walletAddress: txInfo.from })

    //     userId = originUser ? originUser.id : null
    //   }

    //   const value = txInfo.value ? Number(web3.utils.fromWei(txInfo.value)) : 0

    //   // const donation = await Donation.findOne({ id: Number(donationId) })
    //   // if (!donation) throw new Error(`Donation not found by Id ${donationId}`)

    //   donation.transactionId = transactionId

    //   const feathersServer =
    //     config.get('ETHEREUM_NETWORK') === 'ropsten' ? 'develop' : 'beta' // live is beta
    //   const feathersUrl: string = `https://feathers.${feathersServer}.giveth.io/conversionRates?txHash=${transactionId}&from=ETH&isHome=true`

    //   console.log(`feathersUrl ---> : ${feathersUrl}`)
    //   let valueUsd = 0
    //   axios
    //     .get(feathersUrl)
    //     .then(response => {
    //       valueUsd = response.data.rate * Number(value)
    //       donation.valueUsd = valueUsd
    //       donation.save()
    //       console.log('Saved Feathers response')
    //     })
    //     .catch(e => {
    //       console.error('Error calling feathers')
    //       console.log({ e })
    //     })

    //   return true
    // } catch (e) {
    //   //Log the error
    //   Logger.captureException(e)
    //   // Logger.captureMessage(`Error calling feathers for transaction - ${feathersUrl}`);
    //   throw new Error(`Error saving donation`)
    // }
  }
}
