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

import { Brackets } from 'typeorm';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findProjectById } from '../repositories/projectRepository';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
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
  findRecurringDonationByProjectIdAndUserIdAndCurrency,
  updateRecurringDonation,
} from '../repositories/recurringDonationRepository';
import { detectAddressChainType } from '../utils/networks';
import { logger } from '../utils/logger';
import {
  updateDonationQueryValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { sleep } from '../utils/utils';
import SentryLogger from '../sentryLogger';
import { updateRecurringDonationStatusWithNetwork } from '../services/recurringDonationService';

@InputType()
class RecurringDonationSortBy {
  @Field(_type => RecurringDonationSortField)
  field: RecurringDonationSortField;

  @Field(_type => RecurringDonationSortDirection)
  direction: RecurringDonationSortDirection;
}

@InputType()
class FinishStatus {
  @Field(_type => Boolean)
  active: boolean;

  @Field(_type => Boolean)
  ended: boolean;
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

registerEnumType(FinishStatus, {
  name: 'FinishStatus',
  description: 'Filter active status',
});

@ObjectType()
class PaginateRecurringDonations {
  @Field(_type => [RecurringDonation], { nullable: true })
  recurringDonations: RecurringDonation[];

  @Field(_type => Number, { nullable: true })
  totalCount: number;
}

@Service()
@ArgsType()
class UserRecurringDonationsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(_type => RecurringDonationSortBy, {
    defaultValue: {
      field: RecurringDonationSortField.createdAt,
      direction: RecurringDonationSortDirection.DESC,
    },
  })
  orderBy: RecurringDonationSortBy;

  @Field(_type => Int, { nullable: false })
  userId: number;
  @Field(_type => String, { nullable: true })
  status: string;

  @Field(_type => FinishStatus, {
    nullable: true,
    defaultValue: {
      active: true,
      ended: false,
    },
  })
  finishStatus: FinishStatus;

  @Field(_type => [String], { nullable: true, defaultValue: [] })
  filteredTokens: string[];
}

@ObjectType()
class UserRecurringDonations {
  @Field(_type => [RecurringDonation])
  recurringDonations: RecurringDonation[];

  @Field(_type => Int)
  totalCount: number;
}

@Resolver(_of => AnchorContractAddress)
export class RecurringDonationResolver {
  @Mutation(_returns => RecurringDonation, { nullable: true })
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

  @Mutation(_returns => RecurringDonation, { nullable: true })
  async updateRecurringDonationParams(
    @Ctx() ctx: ApolloContext,
    @Arg('projectId', () => Int) projectId: number,
    @Arg('networkId', () => Int) networkId: number,
    @Arg('currency', () => String) currency: string,
    @Arg('txHash', () => String, { nullable: true }) txHash?: string,
    @Arg('flowRate', () => String, { nullable: true }) flowRate?: string,
    @Arg('anonymous', () => Boolean, { nullable: true }) anonymous?: boolean,
    @Arg('status', () => String, { nullable: true }) status?: string,
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
    const recurringDonation =
      await findRecurringDonationByProjectIdAndUserIdAndCurrency({
        projectId: project.id,
        userId: donor.id,
        currency,
      });
    if (!recurringDonation) {
      // TODO set proper error message
      throw new Error(errorMessages.RECURRING_DONATION_NOT_FOUND);
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

    return updateRecurringDonation({
      recurringDonation,
      txHash,
      flowRate,
      anonymous,
      status,
    });
  }

  @Query(_returns => PaginateRecurringDonations, { nullable: true })
  async recurringDonationsByProjectId(
    @Ctx() _ctx: ApolloContext,
    @Arg('take', _type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
    @Arg('status', _type => String, { nullable: true }) status: string,
    @Arg('finishStatus', _type => FinishStatus, {
      nullable: true,
      defaultValue: {
        active: true,
        ended: false,
      },
    })
    finishStatus: FinishStatus,
    @Arg('searchTerm', _type => String, { nullable: true }) searchTerm: string,
    @Arg('orderBy', _type => RecurringDonationSortBy, {
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
    query.orderBy(
      `recurringDonation.${orderBy.field}`,
      orderBy.direction,
      RecurringDonationNullDirection[orderBy.direction as string],
    );
    const finishStatusArray: boolean[] = [];
    if (finishStatus.active) {
      finishStatusArray.push(false);
    }
    if (finishStatus.ended) {
      finishStatusArray.push(true);
    }
    if (finishStatusArray.length > 0) {
      query.andWhere(`recurringDonation.finished in (:...finishStatusArray)`, {
        finishStatusArray,
      });
    }

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
            qb.orWhere('recurringDonation.flowRate =  :searchTerm', {
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

  @Query(_returns => UserRecurringDonations, { nullable: true })
  async recurringDonationsByUserId(
    @Args()
    {
      take,
      skip,
      orderBy,
      userId,
      status,
      finishStatus,
      filteredTokens,
    }: UserRecurringDonationsArgs,
    @Ctx() ctx: ApolloContext,
  ) {
    const loggedInUserId = ctx?.req?.user?.userId;
    const query = RecurringDonation.createQueryBuilder('recurringDonation')
      .leftJoinAndSelect('recurringDonation.project', 'project')
      .leftJoinAndSelect('project.anchorContracts', 'anchor_contract_address')
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
      query.andWhere(`recurringDonation.status = :status`, {
        status,
      });
    }

    const finishStatusArray: boolean[] = [];
    if (finishStatus.active) {
      finishStatusArray.push(false);
    }
    if (finishStatus.ended) {
      finishStatusArray.push(true);
    }
    if (finishStatusArray.length > 0) {
      query.andWhere(`recurringDonation.finished in (:...finishStatusArray)`, {
        finishStatusArray,
      });
    }

    if (filteredTokens && filteredTokens.length > 0) {
      query.andWhere(`recurringDonation.currency IN (:...filteredTokens)`, {
        filteredTokens,
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

  @Mutation(_returns => RecurringDonation)
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
        updatedRecurringDonation.finished = true;
        await updatedRecurringDonation.save();
      }
      return updatedRecurringDonation;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateRecurringDonationStatus() error ', e);
      throw e;
    }
  }
}
