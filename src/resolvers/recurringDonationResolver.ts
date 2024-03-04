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

import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findProjectById } from '../repositories/projectRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { findActiveAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { ApolloContext } from '../types/ApolloContext';
import { findUserById } from '../repositories/userRepository';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import {
  createNewRecurringDonation,
  findRecurringDonationById,
} from '../repositories/recurringDonationRepository';
import { publicSelectionFields } from '../entities/user';
import { Brackets } from 'typeorm';
import { detectAddressChainType } from '../utils/networks';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { logger } from '../utils/logger';
import {
  updateDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { sleep } from '../utils/utils';
import { syncDonationStatusWithBlockchainNetwork } from '../services/donationService';
import SentryLogger from '../sentryLogger';
import { updateRecurringDonationStatusWithNetwork } from '../services/recurringDonationService';

@InputType()
class RecurringDonationSortBy {
  @Field(type => RecurringDonationSortField)
  field: RecurringDonationSortField;

  @Field(type => RecurringDonationSortDirection)
  direction: RecurringDonationSortDirection;
}

export enum RecurringDonationSortField {
  createdAt = 'createdAt',
  flowRate = 'flowRate',
}

enum RecurringDonationSortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

const RecurringDonationNullDirection = {
  ASC: 'NULLS FIRST',
  DESC: 'NULLS LAST',
};

registerEnumType(RecurringDonationSortField, {
  name: 'RecurringDonationSortField',
  description: 'Sort by field',
});

registerEnumType(RecurringDonationSortDirection, {
  name: 'RecurringDonationSortDirection',
  description: 'Sort direction',
});

@ObjectType()
class PaginateRecurringDonations {
  @Field(type => [RecurringDonation], { nullable: true })
  recurringDonations: RecurringDonation[];

  @Field(type => Number, { nullable: true })
  totalCount: number;
}

@Service()
@ArgsType()
class UserRecurringDonationsArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(type => RecurringDonationSortBy, {
    defaultValue: {
      field: RecurringDonationSortField.createdAt,
      direction: RecurringDonationSortDirection.DESC,
    },
  })
  orderBy: RecurringDonationSortBy;

  @Field(type => Int, { nullable: false })
  userId: number;
  @Field(type => String, { nullable: true })
  status: string;

  @Field(type => Boolean, { nullable: true, defaultValue: false })
  finished: boolean;
}

@ObjectType()
class UserRecurringDonations {
  @Field(type => [RecurringDonation])
  recurringDonations: RecurringDonation[];

  @Field(type => Int)
  totalCount: number;
}

@Resolver(of => AnchorContractAddress)
export class RecurringDonationResolver {
  @Mutation(returns => RecurringDonation, { nullable: true })
  async createRecurringDonation(
    @Ctx() ctx: ApolloContext,
    @Arg('projectId', () => Int) projectId: number,
    @Arg('networkId', () => Int) networkId: number,
    @Arg('txHash', () => String) txHash: string,
    @Arg('currency', () => String) currency: string,
    @Arg('flowRate', () => String) flowRate: string,
    @Arg('anonymous', () => Boolean, { defaultValue: false })
    anonymous: boolean,
  ): Promise<RecurringDonation> {
    const userId = ctx?.req?.user?.userId;
    const donor = await findUserById(userId);
    if (!donor) {
      throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
    }
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }
    const currentAnchorProjectAddress = await findActiveAnchorAddress({
      projectId,
      networkId,
    });

    if (!currentAnchorProjectAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.THERE_IS_NOT_ACTIVE_ANCHOR_ADDRESS_FOR_THIS_PROJECT,
        ),
      );
    }

    return createNewRecurringDonation({
      donor,
      project,
      anchorContractAddress: currentAnchorProjectAddress,
      networkId,
      txHash,
      flowRate,
      currency,
      anonymous,
    });
  }

  @Query(returns => PaginateRecurringDonations, { nullable: true })
  async recurringDonationsByProjectId(
    @Ctx() ctx: ApolloContext,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Arg('projectId', type => Int, { nullable: false }) projectId: number,
    @Arg('status', type => String, { nullable: true }) status: string,
    @Arg('finished', type => Boolean, { nullable: true, defaultValue: false })
    finished: boolean,
    @Arg('searchTerm', type => String, { nullable: true }) searchTerm: string,
    @Arg('orderBy', type => RecurringDonationSortBy, {
      defaultValue: {
        field: RecurringDonationSortField.createdAt,
        direction: RecurringDonationSortDirection.DESC,
      },
    })
    orderBy: RecurringDonationSortBy,
  ) {
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    const query = RecurringDonation.createQueryBuilder('recurringDonation')
      .leftJoin('recurringDonation.donor', 'donor')
      .addSelect([
        'donor.id',
        'donor.walletAddress',
        'donor.name',
        'donor.firstName',
        'donor.lastName',
        'donor.url',
        'donor.avatar',
        'donor.totalDonated',
        'donor.totalReceived',
        'donor.passportScore',
        'donor.passportStamps',
      ])
      .where(`recurringDonation.projectId = ${projectId}`);
    query
      .andWhere(`recurringDonation.finished = ${finished}`)
      .orderBy(
        `recurringDonation.${orderBy.field}`,
        orderBy.direction,
        RecurringDonationNullDirection[orderBy.direction as string],
      );

    if (status) {
      query.andWhere(`recurringDonation.status = :status`, {
        status,
      });
    }

    if (searchTerm) {
      query.andWhere(
        new Brackets(qb => {
          qb.where(
            '(donor.name ILIKE :searchTerm AND recurringDonation.anonymous = false)',
            {
              searchTerm: `%${searchTerm}%`,
            },
          )
            .orWhere('recurringDonation.status ILIKE :searchTerm', {
              searchTerm: `%${searchTerm}%`,
            })
            .orWhere('recurringDonation.currency ILIKE :searchTerm', {
              searchTerm: `%${searchTerm}%`,
            });

          if (
            detectAddressChainType(searchTerm) === undefined &&
            Number(searchTerm)
          ) {
            qb.orWhere('recurringDonation.flowRate = :searchTerm', {
              searchTerm,
            });
          }
        }),
      );
    }
    const [recurringDonations, donationsCount] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount();
    return {
      recurringDonations,
      totalCount: donationsCount,
    };
  }

  @Query(returns => UserRecurringDonations, { nullable: true })
  async recurringDonationsByUserId(
    @Args()
    {
      take,
      skip,
      orderBy,
      userId,
      status,
      finished,
    }: UserRecurringDonationsArgs,
    @Ctx() ctx: ApolloContext,
  ) {
    const loggedInUserId = ctx?.req?.user?.userId;
    const query = RecurringDonation.createQueryBuilder('recurringDonation')
      .leftJoinAndSelect('recurringDonation.project', 'project')
      .leftJoin('recurringDonation.donor', 'donor')
      .addSelect([
        'donor.id',
        'donor.walletAddress',
        'donor.name',
        'donor.firstName',
        'donor.lastName',
        'donor.url',
        'donor.avatar',
        'donor.totalDonated',
        'donor.totalReceived',
        'donor.passportScore',
        'donor.passportStamps',
      ])
      .where(`recurringDonation.donorId = ${userId}`)
      .orderBy(
        `recurringDonation.${orderBy.field}`,
        orderBy.direction,
        RecurringDonationNullDirection[orderBy.direction as string],
      );
    if (!loggedInUserId || loggedInUserId !== userId) {
      query.andWhere(`recurringDonation.anonymous = ${false}`);
    }

    if (status) {
      query.andWhere(`donation.status = :status`, {
        status,
      });
    }

    const [recurringDonations, totalCount] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount();
    return {
      recurringDonations,
      totalCount,
    };
  }

  @Mutation(returns => RecurringDonation)
  async updateRecurringDonationStatus(
    @Arg('donationId') donationId: number,
    @Arg('status', { nullable: true }) status: string,
    @Ctx() ctx: ApolloContext,
  ): Promise<RecurringDonation> {
    // TODO We should write more test cases once we implement updateRecurringDonationStatusWithNetwork

    try {
      const userId = ctx?.req?.user?.userId;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      const recurringDonation = await findRecurringDonationById(donationId);
      if (!recurringDonation) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.DONATION_NOT_FOUND),
        );
      }
      if (recurringDonation.donorId !== userId) {
        logger.error(
          'updateRecurringDonationStatus error because requester is not owner of recurringDonation',
          {
            user: ctx?.req?.user,
            donationInfo: {
              id: donationId,
              userId: recurringDonation.donorId,
              status: recurringDonation.status,
              txHash: recurringDonation.txHash,
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
      if (recurringDonation.status === RECURRING_DONATION_STATUS.VERIFIED) {
        return recurringDonation;
      }

      // Sometimes web3 provider doesnt return transactions right after it get mined
      //  so I put a delay , it might solve our problem
      await sleep(10_000);

      const updatedRecurringDonation =
        await updateRecurringDonationStatusWithNetwork({
          donationId,
        });

      if (
        updatedRecurringDonation.status === RECURRING_DONATION_STATUS.PENDING &&
        status === RECURRING_DONATION_STATUS.FAILED
      ) {
        // We just update status of donation with tx status in blockchain network
        // but if user send failed status, and there were nothing in network we change it to failed
        updatedRecurringDonation.status = RECURRING_DONATION_STATUS.FAILED;
        await updatedRecurringDonation.save();
      }
      return updatedRecurringDonation;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateRecurringDonationStatus() error', e);
      throw e;
    }
  }
}
