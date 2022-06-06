import {
  Resolver,
  Query,
  Arg,
  Mutation,
  Ctx,
  ObjectType,
  Field,
  Args,
  ArgsType,
  InputType,
  registerEnumType,
  Int,
} from 'type-graphql';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { InjectRepository } from 'typeorm-typedi-extensions';
// import { getTokenPrices, getOurTokenList } from '../uniswap'
import { getTokenPrices, getOurTokenList } from 'monoswap';
import { Donation, DONATION_STATUS, SortField } from '../entities/donation';
import { MyContext } from '../types/MyContext';
import { Project, ProjStatus } from '../entities/project';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import { Token } from '../entities/token';
import { Repository, In, Brackets } from 'typeorm';
import { User } from '../entities/user';
import SentryLogger from '../sentryLogger';
import { errorMessages } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
import {
  isTokenAcceptableForProject,
  syncDonationStatusWithBlockchainNetwork,
  updateTotalDonationsOfProject,
} from '../services/donationService';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../services/userService';
import { addSegmentEventToQueue } from '../analytics/segmentQueue';
import { bold } from 'chalk';
import { getCampaignDonations } from '../services/trace/traceService';
import { from } from 'form-data';
import {
  createDonationQueryValidator,
  getDonationsQueryValidator,
  updateDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import Web3 from 'web3';
import { logger } from '../utils/logger';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import { findDonationById } from '../repositories/donationRepository';
import { sleep } from '../utils/utils';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';

const analytics = getAnalytics();

@ObjectType()
class PaginateDonations {
  @Field(type => [Donation], { nullable: true })
  donations: Donation[];

  @Field(type => Number, { nullable: true })
  totalCount: number;

  @Field(type => Number, { nullable: true })
  totalUsdBalance: number;

  @Field(type => Number, { nullable: true })
  totalEthBalance: number;
}

enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

const nullDirection = {
  ASC: 'NULLS FIRST',
  DESC: 'NULLS LAST',
};

registerEnumType(SortField, {
  name: 'SortField',
  description: 'Sort by field',
});

registerEnumType(SortDirection, {
  name: 'SortDirection',
  description: 'Sort direction',
});

@InputType()
class SortBy {
  @Field(type => SortField)
  field: SortField;

  @Field(type => SortDirection)
  direction: SortDirection;
}

@Service()
@ArgsType()
class UserDonationsArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(type => SortBy, {
    defaultValue: {
      field: SortField.CreationDate,
      direction: SortDirection.DESC,
    },
  })
  orderBy: SortBy;

  @Field(type => Int, { nullable: false })
  userId: number;
  @Field(type => String, { nullable: true })
  status: string;
}

@ObjectType()
class UserDonations {
  @Field(type => [Donation])
  donations: Donation[];

  @Field(type => Int)
  totalCount: number;
}

@Resolver(of => User)
export class DonationResolver {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  @Query(returns => [Donation], { nullable: true })
  async donations(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
  ) {
    try {
      validateWithJoiSchema({ fromDate, toDate }, getDonationsQueryValidator);
      const query = this.donationRepository
        .createQueryBuilder('donation')
        .leftJoinAndSelect('donation.user', 'user')
        .leftJoinAndSelect('donation.project', 'project');

      if (fromDate) {
        query.andWhere(`"createdAt" >= '${fromDate}'`);
      }
      if (toDate) {
        query.andWhere(`"createdAt" <= '${toDate}'`);
      }
      return await query.getMany();
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets(
    @Ctx() ctx: MyContext,
    @Arg('fromWalletAddresses', type => [String])
    fromWalletAddresses: string[],
  ) {
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o =>
      o.toLowerCase(),
    );
    const donations = await this.donationRepository.find({
      where: {
        fromWalletAddress: In(fromWalletAddressesArray),
      },
    });
    return donations;
  }

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets(
    @Ctx() ctx: MyContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[],
  ) {
    const toWalletAddressesArray: string[] = toWalletAddresses.map(o =>
      o.toLowerCase(),
    );

    const donations = await this.donationRepository.find({
      where: {
        toWalletAddress: In(toWalletAddressesArray),
      },
    });
    return donations;
  }

  @Query(returns => PaginateDonations, { nullable: true })
  async donationsByProjectId(
    @Ctx() ctx: MyContext,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Arg('traceable', type => Boolean, { defaultValue: false })
    traceable: boolean,
    @Arg('projectId', type => Int, { nullable: false }) projectId: number,
    @Arg('status', type => String, { nullable: true }) status: string,
    @Arg('searchTerm', type => String, { nullable: true }) searchTerm: string,
    @Arg('orderBy', type => SortBy, {
      defaultValue: {
        field: SortField.CreationDate,
        direction: SortDirection.DESC,
      },
    })
    orderBy: SortBy,
  ) {
    const project = await Project.findOne({
      id: projectId,
    });
    if (!project) {
      throw new Error(errorMessages.PROJECT_NOT_FOUND);
    }

    if (traceable) {
      const { total, donations } = await getCampaignDonations({
        campaignId: project.traceCampaignId as string,
        take,
        skip,
      });
      return {
        donations,
        totalCount: total,
        totalUsdBalance: project.totalTraceDonations,
      };
    } else {
      const query = this.donationRepository
        .createQueryBuilder('donation')
        .leftJoinAndSelect('donation.user', 'user')
        .where(`donation.projectId = ${projectId}`)
        .orderBy(
          `donation.${orderBy.field}`,
          orderBy.direction,
          nullDirection[orderBy.direction as string],
        );

      if (status) {
        query.andWhere(`donation.status = :status`, {
          status,
        });
      }

      if (searchTerm) {
        query.andWhere(
          new Brackets(qb => {
            qb.where(
              '(user.name ILIKE :searchTerm AND donation.anonymous = false)',
              {
                searchTerm: `%${searchTerm}%`,
              },
            )
              .orWhere('donation.toWalletAddress ILIKE :searchTerm', {
                searchTerm: `%${searchTerm}%`,
              })
              .orWhere('donation.currency ILIKE :searchTerm', {
                searchTerm: `%${searchTerm}%`,
              });

            // WalletAddresses are translanted to huge integers
            // this breaks postgresql query integer limit
            if (!Web3.utils.isAddress(searchTerm)) {
              const amount = Number(searchTerm);

              qb.orWhere('donation.amount = :number', {
                number: amount,
              });
            }
          }),
        );
      }

      const [donations, donationsCount] = await query
        .take(take)
        .skip(skip)
        .getManyAndCount();
      return {
        donations,
        totalCount: donationsCount,
        totalUsdBalance: project.totalDonations,
      };
    }
  }

  @Query(returns => [Token], { nullable: true })
  async tokens() {
    return getOurTokenList();
  }

  @Mutation(returns => [Number])
  async getTokenPrice(
    @Arg('symbol') symbol: string,
    @Arg('chainId') chainId: number,
  ) {
    const prices = await this.getMonoSwapTokenPrices(
      symbol,
      ['USDT', 'ETH'],
      Number(chainId),
    );
    return prices;
  }

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsByDonor(@Ctx() ctx: MyContext) {
    if (!ctx.req.user)
      throw new Error(errorMessages.DONATION_VIEWING_LOGIN_REQUIRED);

    const donations = await this.donationRepository.find({
      where: {
        user: ctx.req.user.userId,
      },
    });

    return donations;
  }

  @Query(returns => UserDonations, { nullable: true })
  async donationsByUserId(
    @Args() { take, skip, orderBy, userId, status }: UserDonationsArgs,
    @Ctx() ctx: MyContext,
  ) {
    const loggedInUserId = ctx?.req?.user?.userId;
    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.project', 'project')
      .leftJoinAndSelect('donation.user', 'user')
      .where(`donation.userId = ${userId}`)
      .orderBy(
        `donation.${orderBy.field}`,
        orderBy.direction,
        nullDirection[orderBy.direction as string],
      );
    if (!loggedInUserId || loggedInUserId !== userId) {
      query.andWhere(`donation.anonymous = ${false}`);
    }

    if (status) {
      query.andWhere(`donation.status = :status`, {
        status,
      });
    }

    const [donations, totalCount] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount();
    return {
      donations,
      totalCount,
    };
  }

  @Mutation(returns => Number)
  async createDonation(
    @Arg('amount') amount: number,
    @Arg('transactionId') transactionId: string,
    @Arg('transactionNetworkId') transactionNetworkId: number,
    @Arg('tokenAddress', { nullable: true }) tokenAddress: string,
    @Arg('anonymous', { nullable: true }) anonymous: boolean,
    @Arg('token') token: string,
    @Arg('projectId') projectId: number,
    @Arg('nonce') nonce: number,
    @Arg('transakId', { nullable: true }) transakId: string,
    @Ctx() ctx: MyContext,
  ): Promise<Number> {
    try {
      const userId = ctx?.req?.user?.userId;
      const donorUser = await findUserById(userId);
      if (!donorUser) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }
      validateWithJoiSchema(
        {
          amount,
          transactionId,
          transactionNetworkId,
          anonymous,
          tokenAddress,
          token,
          projectId,
          nonce,
          transakId,
        },
        createDonationQueryValidator,
      );

      const priceChainId =
        transactionNetworkId === NETWORK_IDS.ROPSTEN
          ? NETWORK_IDS.MAIN_NET
          : transactionNetworkId;

      const project = await Project.createQueryBuilder('project')
        .leftJoinAndSelect('project.organization', 'organization')
        .leftJoinAndSelect('project.status', 'status')
        .where(`project.id = :projectId`, {
          projectId,
        })
        .getOne();

      if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);
      if (project.status.id !== ProjStatus.active) {
        throw new Error(errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION);
      }
      const tokenInDb = await Token.findOne({
        networkId: transactionNetworkId,
        symbol: token,
      });
      const isCustomToken = !Boolean(tokenInDb);
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project.organization.supportCustomTokens) {
        throw new Error(errorMessages.TOKEN_NOT_FOUND);
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project.organization.supportCustomTokens) {
          throw new Error(errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN);
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }
      const projectRelatedAddress =
        await findProjectRecipientAddressByNetworkId({
          projectId,
          networkId: transactionNetworkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          errorMessages.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
        );
      }
      const toAddress = projectRelatedAddress?.address.toLowerCase() as string;
      const fromAddress = donorUser.walletAddress?.toLowerCase() as string;

      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionId?.toLowerCase() || transakId,
        isFiat: Boolean(transakId),
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        user: donorUser,
        tokenAddress,
        nonce,
        project,
        isTokenEligibleForGivback,
        isCustomToken,
        isProjectVerified: project.verified,
        createdAt: new Date(),
        segmentNotified: false,
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        anonymous: Boolean(anonymous),
      });
      await donation.save();
      const baseTokens =
        Number(priceChainId) === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH'];

      try {
        const tokenPrices = await this.getMonoSwapTokenPrices(
          token,
          baseTokens,
          Number(priceChainId),
        );

        if (tokenPrices.length !== 0) {
          donation.priceUsd = Number(tokenPrices[0]);
          donation.priceEth = Number(tokenPrices[1]);

          donation.valueUsd = Number(amount) * donation.priceUsd;
          donation.valueEth = Number(amount) * donation.priceEth;
        }
      } catch (e) {
        logger.error('Error in getting price from monoswap', {
          error: e,
          donation,
        });
        addSegmentEventToQueue({
          event: SegmentEvents.GET_DONATION_PRICE_FAILED,
          analyticsUserId: userId,
          properties: donation,
          anonymousId: null,
        });
        SentryLogger.captureException(
          new Error('Error in getting price from monoswap'),
          {
            extra: {
              donationId: donation.id,
              txHash: donation.transactionId,
              currency: donation.currency,
              network: donation.transactionNetworkId,
            },
          },
        );
      }

      await donation.save();

      // After updating, recalculate user total donated and owner total received
      await updateUserTotalDonated(donorUser.id);
      await updateUserTotalReceived(Number(project.admin));

      // After updating price we update totalDonations
      await updateTotalDonationsOfProject(projectId);
      return donation.id;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('createDonation() error', e);
      throw e;
    }
  }

  @Mutation(returns => Donation)
  async updateDonationStatus(
    @Arg('donationId') donationId: number,
    @Arg('status', { nullable: true }) status: string,
    @Ctx() ctx: MyContext,
  ): Promise<Donation> {
    // We just update status of donation with tx status in blockchain network
    // but if user send failed status, and there were nothing in network we change it to failed
    try {
      const userId = ctx?.req?.user?.userId;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }
      const donation = await findDonationById(donationId);
      if (!donation) {
        throw new Error(errorMessages.DONATION_NOT_FOUND);
      }
      if (donation.userId !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_OWNER_OF_THIS_DONATION);
      }
      validateWithJoiSchema(
        {
          status,
          donationId,
        },
        updateDonationQueryValidator,
      );
      if (donation.status === DONATION_STATUS.VERIFIED) {
        return donation;
      }

      // Sometimes web3 provider doesnt return gnosis transactions right after it get mined
      //  so I put a delay , it might solve our problem
      await sleep(10_000);

      const updatedDonation = await syncDonationStatusWithBlockchainNetwork({
        donationId,
      });
      if (
        updatedDonation.status === DONATION_STATUS.PENDING &&
        status === DONATION_STATUS.FAILED
      ) {
        updatedDonation.status = DONATION_STATUS.FAILED;
        updatedDonation.verifyErrorMessage =
          errorMessages.DONOR_REPORTED_IT_AS_FAILED;
        await updatedDonation.save();
      }
      return updatedDonation;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateDonationStatus() error', e);
      throw e;
    }
  }

  private async getMonoSwapTokenPrices(
    token: string,
    baseTokens: string[],
    chainId: number,
  ): Promise<number[]> {
    try {
      const tokenPrices = await getTokenPrices(token, baseTokens, chainId);

      return tokenPrices;
    } catch (e) {
      logger.debug('Unable to fetch monoswap prices: ', e);
      return [];
    }
  }
}
