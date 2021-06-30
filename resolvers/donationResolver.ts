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


      //Logged in
      if (ctx.req.user && ctx.req.user.userId) {
        userId = ctx.req.user.userId
        originUser = await User.findOne({ id: userId })

        analytics.identifyUser(originUser)

        if (!originUser)
          throw Error(`The logged in user doesn't exist - id ${userId}`)

        const segmentDonationMade = {
          email: originUser != null ? originUser.email : '',
          firstName: originUser != null ? originUser.firstName : '',
          title: project.title,
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
          anonymous: !userId
        }

        analytics.track(
          'Made donation',
          originUser.segmentUserId(),
          segmentDonationMade,
          originUser.segmentUserId()
        )
      }

      const baseTokens =
        Number(priceChainId) === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH']

    const tokenValues = getTokenPrices(token, baseTokens, Number(priceChainId))
        .then(async (prices: number[]) => {
          //console.log(`prices : ${JSON.stringify(prices, null, 2)}`)

          donation.priceUsd = Number(prices[0])
          donation.priceEth = Number(prices[1])

          donation.valueUsd = Number(amount) * donation.priceUsd
          donation.valueEth = Number(amount) * donation.priceEth

          await donation.save()
          
          return [
             donation.valueUsd,
             donation.valueEth
           ]
        })
        .catch(e => {
          throw new Error(e)
        })
        await tokenValues

        const projectOwner = await User.findOne({ id: Number(project.admin) })

        if (projectOwner) {
          await tokenValues
          analytics.identifyUser(projectOwner)
          const segmentDonationReceived = {
            email: projectOwner.email,
            title: project.title,
            firstName: projectOwner.firstName,
            projectOwnerId: project.admin,
            slug: project.slug,
            amount: Number(amount),
            transactionId: transactionId.toString().toLowerCase(),
            transactionNetworkId: Number(transactionNetworkId),
            currency: token,
            createdAt: new Date(),
            toWalletAddress: toAddress.toString().toLowerCase(),
            fromWalletAddress: fromAddress.toString().toLowerCase(),
            donationValueUsd: donation.valueUsd,
            donationValueEth: donation.valueEth
          }

          analytics.track(
            'Donation received',
            projectOwner.segmentUserId(),
            segmentDonationReceived,
            projectOwner.segmentUserId()
            )
        }
      return donation.id
    } catch (e) {
      Logger.captureException(e)
      console.error(e)
      throw new Error(e)
    }
  }
}
