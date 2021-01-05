import {
  Resolver,
  Query,
  Arg,
  Mutation
} from 'type-graphql'
import { DonationInput } from './types/DonationInput'

import { Repository, In } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { User } from '../entities/user'
import { Project } from '../entities/project'
import { Donation } from '../entities/donation'
import { web3 } from '../utils/web3'

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
  async donationsByDonor () {
    const donation = await this.donationRepository.find()
    
    return donation
  }

  @Mutation(returns => Boolean)
  async saveDonation (
    @Arg('transactionId') transactionId: string,
    @Arg('anonymous') anonymous: boolean
  ): Promise<Boolean> {
    
    const txInfo = await web3.eth.getTransaction(transactionId);
    
    if (!txInfo) throw new Error("Transaction ID not found.");
    //if (!ctx.req.user) throw new Error("You must be logged in in order to register project donations");
    
    const originUser = await User.findOne({ walletAddress: txInfo.from });
    const destinationProject = await Project.findOne({ walletAddress: txInfo.to?.toString() || "" });
    
    if(!originUser) throw new Error("Transaction user was not found.");
    //if(!originUser.id != ctx.req.user.userId) throw new Error("This transaction doesn't belong to you.");
    if(!destinationProject) throw new Error("Transaction project was not found.");
    
    const value = txInfo.value ? Number(web3.utils.fromWei(txInfo.value)) : 0 
    const date = new Date();

  
    // https://feathers.beta.giveth.io/conversionRates?txHash=0xf1d564c9890cd8f80455d761ee4ea1e69829f777bd4b0f127fa7ada6d0e8df32&from=PAN&isHome=true

    const donation = await Donation.create({
      amount: Number(value),
      currency: 'ETH', 
      userId: originUser?.id,
      project: destinationProject,
      createdAt: new Date(),
      transactionId: transactionId,
      walletAddress: txInfo.to?.toString(),
      anonymous
    })
    
    donation.save()
  
    return true
  }

}
