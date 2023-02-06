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
import { getOurTokenList } from 'monoswap';
import { Donation, DONATION_STATUS, SortField } from '../entities/donation';
import { MyContext } from '../types/MyContext';
import { Project, ProjStatus } from '../entities/project';
import { Token } from '../entities/token';
import { Brackets, In, Repository } from 'typeorm';
import { publicSelectionFields, User } from '../entities/user';
import SentryLogger from '../sentryLogger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
import {
  getMonoSwapTokenPrices,
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
import Web3 from 'web3';
import { logger } from '../utils/logger';
import { findUserById } from '../repositories/userRepository';
import {
  donationsTotalAmountPerDateRange,
  donationsTotalAmountPerDateRangeByMonth,
  donorsCountPerDate,
  donorsCountPerDateByMonthAndYear,
  findDonationById,
  getRecentDonations,
} from '../repositories/donationRepository';
import { sleep } from '../utils/utils';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { MainCategory } from '../entities/mainCategory';
import { findProjectById } from '../repositories/projectRepository';
import { AppDataSource } from '../orm';
import { getChainvineAdapter } from '../adapters/adaptersFactory';

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

@Resolver(of => User)
export class DonationResolver {
  constructor(private readonly donationRepository: Repository<Donation>) {
    this.donationRepository =
      AppDataSource.getDataSource().getRepository(Donation);
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
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await donationsTotalAmountPerDateRange(fromDate, toDate);
      const totalPerMonthAndYear =
        await donationsTotalAmountPerDateRangeByMonth(fromDate, toDate);

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
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await donorsCountPerDate(fromDate, toDate);
      const totalPerMonthAndYear = await donorsCountPerDateByMonthAndYear(
        fromDate,
        toDate,
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
    @Ctx() ctx: MyContext,
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
    @Ctx() ctx: MyContext,
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
      .addSelect(publicSelectionFields)
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

  @Query(returns => [Token], { nullable: true })
  async tokens() {
    return getOurTokenList();
  }

  @Mutation(returns => [Number])
  async getTokenPrice(
    @Arg('symbol') symbol: string,
    @Arg('chainId') chainId: number,
  ) {
    const prices = await getMonoSwapTokenPrices(
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
      throw new Error(
        i18n.__(translationErrorMessagesKeys.DONATION_VIEWING_LOGIN_REQUIRED),
      );
    return this.donationRepository
      .createQueryBuilder('donation')
      .where({ userId: ctx.req.user.userId })
      .leftJoin('donation.user', 'user')
      .addSelect(publicSelectionFields)
      .leftJoinAndSelect('donation.project', 'project')
      .getMany();
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
    @Arg('referrerId', { nullable: true }) referrerId: string,
    @Ctx() ctx: MyContext,
  ): Promise<Number> {
    try {
      let referrerWallet;
      const userId = ctx?.req?.user?.userId;
      const donorUser = await findUserById(userId);
      if (!donorUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
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
          referrerId,
        },
        createDonationQueryValidator,
      );

      const priceChainId =
        transactionNetworkId === NETWORK_IDS.ROPSTEN ||
        transactionNetworkId === NETWORK_IDS.GOERLI
          ? NETWORK_IDS.MAIN_NET
          : transactionNetworkId;

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
          networkId: transactionNetworkId,
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
          networkId: transactionNetworkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
          ),
        );
      }
      const toAddress = projectRelatedAddress?.address.toLowerCase() as string;
      const fromAddress = donorUser.walletAddress?.toLowerCase() as string;

      if (referrerId) {
        try {
          const referrerWalletAddress =
            await getChainvineAdapter().getWalletAddressFromReferer(referrerId);
          if (referrerWalletAddress !== fromAddress) {
            referrerWallet = referrerWalletAddress;
          } else {
            logger.info(
              'createDonation info',
              `User ${fromAddress} tried to refer himself.`,
            );
          }
        } catch (e) {
          logger.error('get chainvine wallet address error', e);
        }
      }

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

      if (referrerWallet) {
        donation.referrerWallet = referrerWallet;
      }

      await donation.save();
      const baseTokens =
        priceChainId === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH'];

      await updateDonationPricesAndValues(
        donation,
        project,
        token,
        baseTokens,
        priceChainId,
        amount,
      );

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
}
