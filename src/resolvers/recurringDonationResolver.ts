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
import { RecurringDonation } from '../entities/recurringDonation';
import { createNewRecurringDonation } from '../repositories/recurringDonationRepository';
import { publicSelectionFields } from '../entities/user';
import { Brackets } from 'typeorm';
import { detectAddressChainType } from '../utils/networks';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';

@InputType()
class RecurringDonationSortBy {
  @Field(type => RecurringDonationSortField)
  field: RecurringDonationSortField;

  @Field(type => RecurringDonationSortDirection)
  direction: RecurringDonationSortDirection;
}

export enum RecurringDonationSortField {
  createdAt = 'createdAt',
  amount = 'amount',
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
}

@ObjectType()
class UserDonations {
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
            .orWhere('recurringDonation.toWalletAddress ILIKE :searchTerm', {
              searchTerm: `%${searchTerm}%`,
            })
            .orWhere('recurringDonation.currency ILIKE :searchTerm', {
              searchTerm: `%${searchTerm}%`,
            });

          if (detectAddressChainType(searchTerm) === undefined) {
            const amount = Number(searchTerm);

            qb.orWhere('recurringDonation.amount = :amount', {
              amount,
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
}
