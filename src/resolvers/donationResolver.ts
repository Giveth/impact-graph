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
import { Donation, SortField } from '../entities/donation';
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
  getDonationsQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import Web3 from 'web3';
import { logger } from '../utils/logger';
import {
  createDonation,
  findDonationByUserId,
  findDonationsFromWalletAddresses,
  findDonationsToWalletAddresses,
  findDonationWithJoinToUserAndProject,
} from '../repositories/donationRepository';
import {
  findProjectById,
  findProjectByIdJoin,
} from '../repositories/projectRepository';
import { findTokenById } from '../repositories/tokenRepository';
import { findUserById } from '../repositories/userRepository';

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
      // const query = this.donationRepository
      //   .createQueryBuilder('donation')
      //   .leftJoinAndSelect('donation.user', 'user')
      //   .leftJoinAndSelect('donation.project', 'project');
      //
      // if (fromDate) {
      //   query.andWhere(`"createdAt" >= '${fromDate}'`);
      // }
      // if (toDate) {
      //   query.andWhere(`"createdAt" <= '${toDate}'`);
      // }
      // return await query.getMany();
      return await findDonationWithJoinToUserAndProject({ fromDate, toDate });
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets(
    @Ctx() ctx: MyContext,
    @Arg('fromWalletAddresses', type => [String])
    fromWalletAddresses: string[],
  ) {
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o =>
      o.toLowerCase(),
    );
    // const donations = await this.donationRepository.find({
    //   where: {
    //     fromWalletAddress: In(fromWalletAddressesArray),
    //   },
    // });
    const donations = await findDonationsFromWalletAddresses(
      fromWalletAddressesArray,
    );
    return donations;
  }

  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets(
    @Ctx() ctx: MyContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[],
  ) {
    // const toWalletAddressesArray: string[] = toWalletAddresses.map(o =>
    //   o.toLowerCase(),
    // );

    // const donations = await this.donationRepository.find({
    //   where: {
    //     toWalletAddress: In(toWalletAddressesArray),
    //   },
    // });
    const donations = await findDonationsToWalletAddresses(toWalletAddresses);
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
    @Arg('searchTerm', type => String, { nullable: true }) searchTerm: string,
    @Arg('orderBy', type => SortBy, {
      defaultValue: {
        field: SortField.CreationDate,
        direction: SortDirection.DESC,
      },
    })
    orderBy: SortBy,
  ) {
    // const project = await Project.findOne({
    //   id: projectId,
    // });
    const project = await findProjectById(projectId);
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
      // TODO
      const query = this.donationRepository
        .createQueryBuilder('donation')
        .leftJoinAndSelect('donation.user', 'user')
        .where(`donation.projectId = ${projectId}`)
        .orderBy(
          `donation.${orderBy.field}`,
          orderBy.direction,
          nullDirection[orderBy.direction as string],
        );

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

  @Query(returns => [Donation], { nullable: true })
  async donationsByDonor(@Ctx() ctx: MyContext) {
    if (!ctx.req.user)
      throw new Error(errorMessages.DONATION_VIEWING_LOGIN_REQUIRED);

    // const donations = await this.donationRepository.find({
    //   where: {
    //     user: ctx.req.user.userId,
    //   },
    // });
    const donations = await findDonationByUserId(ctx.req.user.userId);

    return donations;
  }

  @Query(returns => UserDonations, { nullable: true })
  async donationsByUserId(
    @Args() { take, skip, orderBy, userId }: UserDonationsArgs,
  ) {
    // TODO
    const [donations, totalCount] = await this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.project', 'project')
      .leftJoinAndSelect('donation.user', 'user')
      .where(`donation.userId = ${userId}`)
      .orderBy(
        `donation.${orderBy.field}`,
        orderBy.direction,
        nullDirection[orderBy.direction as string],
      )
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      donations,
      totalCount,
    };
  }

  @Mutation(returns => Number)
  async saveDonation(
    @Arg('fromAddress') fromAddress: string,
    @Arg('toAddress') toAddress: string,
    @Arg('amount') amount: number,
    @Arg('transactionId', { nullable: true }) transactionId: string,
    @Arg('transactionNetworkId') transactionNetworkId: number,
    @Arg('tokenAddress', { nullable: true }) tokenAddress: string,
    @Arg('anonymous', { nullable: true }) anonymous: boolean,
    @Arg('token') token: string,
    @Arg('projectId') projectId: number,
    @Arg('chainId') chainId: number,
    @Arg('transakId', { nullable: true }) transakId: string,
    // TODO should remove this in the future, we dont use transakStatus in creating donation
    @Arg('transakStatus', { nullable: true }) transakStatus: string,
    @Ctx() ctx: MyContext,
  ): Promise<Number> {
    try {
      let userId = ctx?.req?.user?.userId || null;
      if (!chainId) chainId = NETWORK_IDS.MAIN_NET;
      const priceChainId =
        chainId === NETWORK_IDS.ROPSTEN ? NETWORK_IDS.MAIN_NET : chainId;
      let donorUser;

      // const project = await Project.createQueryBuilder('project')
      //   .leftJoinAndSelect('project.organization', 'organization')
      //   .leftJoinAndSelect('project.status', 'status')
      //   .where(`project.id =${projectId}`)
      //   .getOne();
      const project = await findProjectByIdJoin(projectId);

      if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);
      if (project.status.id !== ProjStatus.active) {
        throw new Error(errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION);
      }
      // const tokenInDb = await Token.findOne({
      //   networkId: chainId,
      //   symbol: token,
      // });
      const tokenInDb = await findTokenById({ chainId, token });
      let isTokenEligibleForGivback = false;
      if (!tokenInDb && !project.organization.supportCustomTokens) {
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

      if (project.walletAddress?.toLowerCase() !== toAddress.toLowerCase()) {
        throw new Error(
          errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
        );
      }

      if (userId) {
        // donorUser = await findUserById(ctx.req.user.userId);
        donorUser = await findUserById(ctx.req.user.userId);
      } else {
        donorUser = null;
      }

      // ONLY when logged in, allow setting the anonymous boolean
      const donationAnonymous =
        userId && anonymous !== undefined ? anonymous : !userId;

      const donation = await createDonation({
        amount: Number(amount),
        transactionId: transactionId?.toLowerCase() || transakId,
        transactionNetworkId: Number(transactionNetworkId),
        donorUser,
        tokenAddress,
        project,
        isTokenEligibleForGivback,
        isProjectVerified: project.verified,
        segmentNotified: true,
        toWalletAddress: toAddress.toString().toLowerCase(),
        fromWalletAddress: fromAddress.toString().toLowerCase(),
        donationAnonymous,
        transakId,
        token,
      });
      // await donation.save();
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
      }

      await donation.save();

      if (donorUser) {
        // After updating, recalculate user total donated and owner total received
        await updateUserTotalDonated(donorUser.id);
      }
      await updateUserTotalReceived(Number(project.admin));

      // After updating price we update totalDonations
      await updateTotalDonationsOfProject(projectId);

      if (transakId) {
        // we send segment event for transak donations after the transak call our webhook to verifying transactions
        return donation.id;
      }

      const segmentDonationInfo = {
        slug: project.slug,
        title: project.title,
        amount: Number(amount),
        transactionId: transactionId.toLowerCase(),
        toWalletAddress: toAddress.toLowerCase(),
        fromWalletAddress: fromAddress.toLowerCase(),
        donationValueUsd: donation.valueUsd,
        donationValueEth: donation.valueEth,
        verified: Boolean(project.verified),
        projectOwnerId: project.admin,
        transactionNetworkId: Number(transactionNetworkId),
        currency: token,
        projectWalletAddress: project.walletAddress,
        segmentNotified: true,
        createdAt: new Date(),
      };

      if (ctx.req.user && ctx.req.user.userId) {
        userId = ctx.req.user.userId;
        // donorUser = await findUserById(userId);
        donorUser = await findUserById(userId);
        analytics.identifyUser(donorUser);
        if (!donorUser)
          throw Error(`The logged in user doesn't exist - id ${userId}`);
        logger.debug(donation.valueUsd);

        const segmentDonationMade = {
          ...segmentDonationInfo,
          email: donorUser != null ? donorUser.email : '',
          firstName: donorUser != null ? donorUser.firstName : '',
          anonymous: !userId,
        };

        analytics.track(
          SegmentEvents.MADE_DONATION,
          donorUser.segmentUserId(),
          segmentDonationMade,
          donorUser.segmentUserId(),
        );
      }

      // const projectOwner = await findUserById(Number(project.admin));
      const projectOwner = await findUserById(Number(project.admin));

      if (projectOwner) {
        analytics.identifyUser(projectOwner);

        const segmentDonationReceived = {
          ...segmentDonationInfo,
          email: projectOwner.email,
          firstName: projectOwner.firstName,
        };

        analytics.track(
          SegmentEvents.DONATION_RECEIVED,
          projectOwner.segmentUserId(),
          segmentDonationReceived,
          projectOwner.segmentUserId(),
        );
      }
      return donation.id;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('saveDonation() error', e);
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
