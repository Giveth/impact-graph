import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { Donation, DONATION_STATUS, SortField } from '../entities/donation';
import { ApolloContext } from '../types/ApolloContext';
import { Project, ProjStatus } from '../entities/project';
import { Token } from '../entities/token';
import { Brackets, In, Repository } from 'typeorm';
import { publicSelectionFields, User } from '../entities/user';
import SentryLogger from '../sentryLogger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
import {
  isTokenAcceptableForProject,
  syncDonationStatusWithBlockchainNetwork,
  updateDonationPricesAndValues,
} from '../services/donationService';
import {
  createDonationQueryValidator,
  getDonationsQueryValidator,
  resourcePerDateReportValidator,
  updateDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import {
  findUserById,
  setUserAsReferrer,
} from '../repositories/userRepository';
import {
  donationsNumberPerDateRange,
  donationsTotalAmountPerDateRange,
  donationsTotalAmountPerDateRangeByMonth,
  donationsTotalNumberPerDateRangeByMonth,
  donorsCountPerDate,
  donorsCountPerDateByMonthAndYear,
  findDonationById,
  getRecentDonations,
  isVerifiedDonationExistsInQfRound,
} from '../repositories/donationRepository';
import { sleep } from '../utils/utils';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { MainCategory } from '../entities/mainCategory';
import { findProjectById } from '../repositories/projectRepository';
import { AppDataSource } from '../orm';
import { getChainvineReferralInfoForDonation } from '../services/chainvineReferralService';
import { relatedActiveQfRoundForProject } from '../services/qfRoundService';
import { detectAddressChainType } from '../utils/networks';
import { ChainType } from '../types/network';
import {
  getAppropriateNetworkId,
  getDefaultSolanaChainId,
} from '../services/chains';
import { markDraftDonationStatusMatched } from '../repositories/draftDonationRepository';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';

const draftDonationEnabled = process.env.ENABLE_DRAFT_DONATION === 'true';

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

// As general as posible types to reuse it
@ObjectType()
export class ResourcesTotalPerMonthAndYear {
  @Field(type => Number, { nullable: true })
  total?: Number;

  @Field(type => String, { nullable: true })
  date?: String;
}

@ObjectType()
export class ResourcePerDateRange {
  @Field(type => Number, { nullable: true })
  total?: Number;

  @Field(type => [ResourcesTotalPerMonthAndYear], { nullable: true })
  totalPerMonthAndYear?: ResourcesTotalPerMonthAndYear[];
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

@ObjectType()
class MainCategoryDonations {
  @Field(type => Int)
  id: number;

  @Field(type => String)
  title: string;

  @Field(type => String)
  slug: string;

  @Field(type => Number)
  totalUsd: number;
}

@ObjectType()
class DonationCurrencyStats {
  @Field(type => String, { nullable: true })
  currency?: String;

  @Field(type => Int, { nullable: true })
  uniqueDonorCount?: number;

  @Field(type => Number, { nullable: true })
  currencyPercentage?: Number;
}

@Resolver(of => User)
export class DonationResolver {
  private readonly donationRepository: Repository<Donation>;
  constructor() {
    this.donationRepository =
      AppDataSource.getDataSource().getRepository(Donation);
  }

  @Query(returns => [DonationCurrencyStats])
  async getDonationStats(): Promise<DonationCurrencyStats[]> {
    const query = `
      SELECT
        currency,
        COUNT(DISTINCT "userId") AS "uniqueDonorCount",
        COUNT(DISTINCT "userId") * 100.0 / SUM(COUNT(DISTINCT "userId")) OVER () AS "currencyPercentage"
      FROM public.donation
      GROUP BY currency
      ORDER BY currency;
    `;

    const result = await Donation.query(query);
    return result;
  }

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
        .leftJoin('donation.user', 'user')
        .addSelect(publicSelectionFields)
        .leftJoinAndSelect('donation.project', 'project')
        .leftJoinAndSelect('project.categories', 'categories')
        .leftJoin('project.projectPower', 'projectPower')
        .addSelect([
          'projectPower.totalPower',
          'projectPower.powerRank',
          'projectPower.round',
        ]);

      if (fromDate) {
        query.andWhere(`donation."createdAt" >= '${fromDate}'`);
      }
      if (toDate) {
        query.andWhere(`donation."createdAt" <= '${toDate}'`);
      }
      return await query.getMany();
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  @Query(returns => [MainCategoryDonations], { nullable: true })
  async totalDonationsPerCategory(
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
    @Arg('fromOptimismOnly', { nullable: true }) fromOptimismOnly?: boolean,
  ): Promise<MainCategoryDonations[] | []> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const query = MainCategory.createQueryBuilder('mainCategory')
        .select(
          'mainCategory.id, mainCategory.title, mainCategory.slug, COALESCE(sum(donations.valueUsd), 0) as "totalUsd"',
        )
        .leftJoin('mainCategory.categories', 'categories')
        .leftJoin('categories.projects', 'projects')
        .leftJoin(
          'projects.donations',
          'donations',
          `donations.status = 'verified'`,
        )
        .groupBy('mainCategory.id, mainCategory.title');

      if (fromDate && toDate) {
        query.where(`donations."createdAt" >= '${fromDate}'`);
        query.andWhere(`donations."createdAt" <= '${toDate}'`);
      } else if (fromDate && !toDate) {
        query.where(`donations."createdAt" >= '${fromDate}'`);
      } else if (!fromDate && toDate) {
        query.where(`donations."createdAt" <= '${toDate}'`);
      }

      if (fromOptimismOnly) {
        if (fromDate || toDate) {
          query.andWhere(`donations."transactionNetworkId" = 10`);
        } else {
          query.where(`donations."transactionNetworkId" = 10`);
        }
      }

      const result = await query.getRawMany();
      return result;
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  @Query(returns => ResourcePerDateRange, { nullable: true })
  async donationsTotalUsdPerDate(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
    @Arg('fromOptimismOnly', { nullable: true }) fromOptimismOnly?: boolean,
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await donationsTotalAmountPerDateRange(
        fromDate,
        toDate,
        fromOptimismOnly,
      );
      const totalPerMonthAndYear =
        await donationsTotalAmountPerDateRangeByMonth(
          fromDate,
          toDate,
          fromOptimismOnly,
        );

      return {
        total,
        totalPerMonthAndYear,
      };
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  @Query(returns => ResourcePerDateRange, { nullable: true })
  async totalDonationsNumberPerDate(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
    @Arg('fromOptimismOnly', { nullable: true }) fromOptimismOnly?: boolean,
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await donationsNumberPerDateRange(
        fromDate,
        toDate,
        fromOptimismOnly,
      );
      const totalPerMonthAndYear =
        await donationsTotalNumberPerDateRangeByMonth(
          fromDate,
          toDate,
          fromOptimismOnly,
        );

      return {
        total,
        totalPerMonthAndYear,
      };
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  /**
   *
   * @param take
   * @return last donations' id, valueUd, createdAt, user.walletAddress and project.slug
   */
  @Query(returns => [Donation], { nullable: true })
  async recentDonations(
    @Arg('take', type => Int, { nullable: true }) take: number = 30,
  ): Promise<Donation[]> {
    return getRecentDonations(take);
  }

  @Query(returns => ResourcePerDateRange, { nullable: true })
  async totalDonorsCountPerDate(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
    @Arg('fromOptimismOnly', { nullable: true }) fromOptimismOnly?: boolean,
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await donorsCountPerDate(
        fromDate,
        toDate,
        fromOptimismOnly,
      );
      const totalPerMonthAndYear = await donorsCountPerDateByMonthAndYear(
        fromDate,
        toDate,
        fromOptimismOnly,
      );
      return {
        total,
        totalPerMonthAndYear,
      };
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsFromWallets(
    @Ctx() ctx: ApolloContext,
    @Arg('fromWalletAddresses', type => [String])
    fromWalletAddresses: string[],
  ) {
    const fromWalletAddressesArray: string[] = fromWalletAddresses.map(o =>
      o.toLowerCase(),
    );
    return this.donationRepository
      .createQueryBuilder('donation')
      .where({ fromWalletAddress: In(fromWalletAddressesArray) })
      .leftJoin('donation.user', 'user')
      .addSelect(publicSelectionFields)
      .leftJoinAndSelect('donation.project', 'project')
      .getMany();
  }

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsToWallets(
    @Ctx() ctx: ApolloContext,
    @Arg('toWalletAddresses', type => [String]) toWalletAddresses: string[],
  ) {
    const toWalletAddressesArray: string[] = toWalletAddresses.map(o =>
      o.toLowerCase(),
    );

    return this.donationRepository
      .createQueryBuilder('donation')
      .where({ toWalletAddress: In(toWalletAddressesArray) })
      .leftJoin('donation.user', 'user')
      .addSelect(publicSelectionFields)
      .leftJoinAndSelect('donation.project', 'project')
      .getMany();
  }

  @Query(returns => PaginateDonations, { nullable: true })
  async donationsByProjectId(
    @Ctx() ctx: ApolloContext,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Arg('traceable', type => Boolean, { defaultValue: false })
    traceable: boolean,
    @Arg('qfRoundId', type => Int, { defaultValue: null, nullable: true })
    qfRoundId: number,
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
      where: {
        id: projectId,
      },
    });
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoin('donation.user', 'user')
      .leftJoinAndSelect('donation.qfRound', 'qfRound')
      .addSelect(publicSelectionFields)
      .where(
        `donation.projectId = ${projectId} AND donation.recurringDonationId IS NULL`,
      )
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

    if (qfRoundId) {
      query.andWhere('qfRound.id = :qfRoundId', {
        qfRoundId,
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

          if (detectAddressChainType(searchTerm) === undefined) {
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

  // TODO I think we can delete this resolver
  @Query(returns => [Donation], { nullable: true })
  async donationsByDonor(@Ctx() ctx: ApolloContext) {
    if (!ctx.req.user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.DONATION_VIEWING_LOGIN_REQUIRED),
      );
    return this.donationRepository
      .createQueryBuilder('donation')
      .where({ userId: ctx.req.user.userId })
      .andWhere(`donation.recurringDonationId IS NULL`)
      .leftJoin('donation.user', 'user')
      .addSelect(publicSelectionFields)
      .leftJoinAndSelect('donation.project', 'project')
      .getMany();
  }

  @Query(returns => UserDonations, { nullable: true })
  async donationsByUserId(
    @Args() { take, skip, orderBy, userId, status }: UserDonationsArgs,
    @Ctx() ctx: ApolloContext,
  ) {
    const loggedInUserId = ctx?.req?.user?.userId;
    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.project', 'project')
      .leftJoinAndSelect('donation.user', 'user')
      .leftJoinAndSelect('donation.qfRound', 'qfRound')
      .where(`donation.userId = ${userId}`)
      .andWhere(`donation.recurringDonationId IS NULL`)
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
    @Arg('transactionId', { nullable: true }) transactionId: string,
    @Arg('transactionNetworkId') transactionNetworkId: number,
    @Arg('tokenAddress', { nullable: true }) tokenAddress: string,
    @Arg('anonymous', { nullable: true }) anonymous: boolean,
    @Arg('token') token: string,
    @Arg('projectId') projectId: number,
    @Arg('nonce', { nullable: true }) nonce: number,
    @Arg('transakId', { nullable: true }) transakId: string,
    @Ctx() ctx: ApolloContext,
    @Arg('referrerId', { nullable: true }) referrerId?: string,
    @Arg('safeTransactionId', { nullable: true }) safeTransactionId?: string,
    @Arg('draftDonationId', { nullable: true }) draftDonationId?: number,
  ): Promise<Number> {
    const logData = {
      amount,
      transactionId,
      transactionNetworkId,
      tokenAddress,
      anonymous,
      token,
      projectId,
      nonce,
      transakId,
      referrerId,
      userId: ctx?.req?.user?.userId,
    };
    logger.debug(
      'createDonation() resolver has been called with this data',
      logData,
    );
    try {
      const userId = ctx?.req?.user?.userId;
      const donorUser = await findUserById(userId);
      if (!donorUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      const chainType = detectAddressChainType(donorUser.walletAddress!);
      const networkId = getAppropriateNetworkId({
        networkId: transactionNetworkId,
        chainType,
      });

      const validaDataInput = {
        amount,
        transactionId,
        transactionNetworkId: networkId,
        anonymous,
        tokenAddress,
        token,
        projectId,
        nonce,
        transakId,
        referrerId,
        safeTransactionId,
        chainType,
      };
      try {
        validateWithJoiSchema(validaDataInput, createDonationQueryValidator);
      } catch (e) {
        logger.error(
          'Error on validating createDonation input',
          validaDataInput,
        );
        // Joi alternatives does not handle custom errors, have to catch them.
        if (e.message.includes('does not match any of the allowed types')) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.INVALID_TRANSACTION_ID),
          );
        } else {
          throw e; // Rethrow the original error
        }
      }

      const project = await findProjectById(projectId);

      if (!project)
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      if (project.status.id !== ProjStatus.active) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
          ),
        );
      }
      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: token,
        },
      });
      const isCustomToken = !Boolean(tokenInDb);
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project.organization.supportCustomTokens) {
        throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project.organization.supportCustomTokens) {
          throw new Error(
            i18n.__(
              translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
            ),
          );
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }
      const projectRelatedAddress =
        await findProjectRecipientAddressByNetworkId({
          projectId,
          networkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
          ),
        );
      }
      let toAddress = projectRelatedAddress?.address;
      let fromAddress = donorUser.walletAddress!;
      let transactionTx = transactionId;

      // Keep the flow the same as before if it's EVM
      if (chainType === ChainType.EVM) {
        toAddress = toAddress?.toLowerCase();
        fromAddress = fromAddress?.toLowerCase();
        transactionTx = transactionId?.toLowerCase() as string;
      }

      const donation = await Donation.create({
        amount: Number(amount),
        transactionId: transactionTx,
        isFiat: Boolean(transakId),
        transactionNetworkId: networkId,
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
        toWalletAddress: toAddress,
        fromWalletAddress: fromAddress,
        anonymous: Boolean(anonymous),
        safeTransactionId,
        chainType: chainType as ChainType,
      });
      if (referrerId) {
        // Fill referrer data if referrerId is valid
        try {
          const {
            referralStartTimestamp,
            isReferrerGivbackEligible,
            referrerWalletAddress,
          } = await getChainvineReferralInfoForDonation({
            referrerId,
            fromAddress,
            donorUserId: donorUser.id,
            projectVerified: project.verified,
          });
          donation.isReferrerGivbackEligible = isReferrerGivbackEligible;
          donation.referrerWallet = referrerWalletAddress;
          donation.referralStartTimestamp = referralStartTimestamp;

          await setUserAsReferrer(referrerWalletAddress);
        } catch (e) {
          logger.error('get chainvine wallet address error', e);
        }
      }
      const activeQfRoundForProject = await relatedActiveQfRoundForProject(
        projectId,
      );
      if (
        activeQfRoundForProject &&
        activeQfRoundForProject.isEligibleNetwork(networkId)
      ) {
        donation.qfRound = activeQfRoundForProject;
      }
      if (draftDonationEnabled && draftDonationId) {
        const draftDonation = await DraftDonation.findOne({
          where: { id: draftDonationId, status: DRAFT_DONATION_STATUS.MATCHED },
          select: ['matchedDonationId'],
        });
        if (draftDonation?.matchedDonationId) {
          return draftDonation.matchedDonationId;
        }
      }
      await donation.save();

      let priceChainId;

      switch (transactionNetworkId) {
        case NETWORK_IDS.ROPSTEN:
          priceChainId = NETWORK_IDS.MAIN_NET;
          break;
        case NETWORK_IDS.GOERLI:
          priceChainId = NETWORK_IDS.MAIN_NET;
          break;
        case NETWORK_IDS.OPTIMISM_SEPOLIA:
          priceChainId = NETWORK_IDS.OPTIMISTIC;
          break;
        case NETWORK_IDS.MORDOR_ETC_TESTNET:
          priceChainId = NETWORK_IDS.ETC;
          break;
        default:
          priceChainId = networkId;
          break;
      }

      await updateDonationPricesAndValues(
        donation,
        project,
        tokenInDb,
        token,
        priceChainId,
        amount,
      );

      if (chainType === ChainType.EVM) {
        await markDraftDonationStatusMatched({
          matchedDonationId: donation.id,
          fromWalletAddress: fromAddress,
          toWalletAddress: toAddress,
          currency: token,
          amount: Number(amount),
          networkId,
        });
      }

      return donation.id;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('createDonation() error', {
        error: e,
        inputData: logData,
      });
      throw e;
    }
  }

  @Mutation(returns => Donation)
  async updateDonationStatus(
    @Arg('donationId') donationId: number,
    @Arg('status', { nullable: true }) status: string,
    @Ctx() ctx: ApolloContext,
  ): Promise<Donation> {
    // We just update status of donation with tx status in blockchain network
    // but if user send failed status, and there were nothing in network we change it to failed
    try {
      const userId = ctx?.req?.user?.userId;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      const donation = await findDonationById(donationId);
      if (!donation) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.DONATION_NOT_FOUND),
        );
      }
      if (donation.userId !== userId) {
        logger.error(
          'updateDonationStatus error because requester is not owner of donation',
          {
            user: ctx?.req?.user,
            donationInfo: {
              id: donationId,
              userId: donation.userId,
              status: donation.status,
              txHash: donation.transactionId,
            },
          },
        );
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_ARE_NOT_OWNER_OF_THIS_DONATION,
          ),
        );
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
        updatedDonation.verifyErrorMessage = i18n.__(
          translationErrorMessagesKeys.DONOR_REPORTED_IT_AS_FAILED,
        );
        await updatedDonation.save();
      }
      return updatedDonation;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateDonationStatus() error', e);
      throw e;
    }
  }

  @Query(() => Boolean)
  async doesDonatedToProjectInQfRound(
    @Arg('projectId', _ => Int) projectId: number,
    @Arg('qfRoundId', _ => Int) qfRoundId: number,
    @Arg('userId', _ => Int) userId: number,
  ): Promise<Boolean> {
    return isVerifiedDonationExistsInQfRound({
      projectId,
      qfRoundId,
      userId,
    });
  }
}
