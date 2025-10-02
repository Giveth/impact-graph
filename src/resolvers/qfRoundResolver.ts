import {
  Arg,
  Args,
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from 'type-graphql';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { User } from '../entities/user';
import {
  findActiveQfRounds,
  findQfRounds,
  findArchivedQfRounds,
  findQfRoundBySlug,
  getProjectDonationsSqrtRootSum,
  QFArchivedRounds,
  QfArchivedRoundsSortType,
  getQfRoundStats,
  getQfRoundTotalSqrtRootSumSquared,
  findActiveQfRound,
} from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';
import { OrderDirection } from './projectResolver';

export enum QfRoundsSortType {
  roundId = 'roundId',
  priority = 'priority',
}

registerEnumType(QfRoundsSortType, {
  name: 'QfRoundsSortType',
});
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { UserQfRoundModelScore } from '../entities/userQfRoundModelScore';
import { findUserByWalletAddress } from '../repositories/userRepository';
import {
  selectQfRoundForProject,
  QfRoundSmartSelectError,
} from '../services/qfRoundSmartSelectService';

@ObjectType()
export class QfRoundStatsResponse {
  @Field()
  uniqueDonors: number;

  @Field()
  donationsCount: number;

  @Field()
  allDonationsUsdValue: number;

  @Field()
  matchingPool: number;

  @Field()
  qfRound: QfRound;
}

@ObjectType()
export class ExpectedMatchingResponse {
  @Field()
  projectDonationsSqrtRootSum: number;

  @Field()
  allProjectsSum: number;

  @Field()
  matchingPool: number;
}

@ObjectType()
export class QfRoundSmartSelectResponse {
  @Field(_type => Int)
  qfRoundId: number;

  @Field()
  qfRoundName: string;

  @Field(_type => Number)
  matchingPoolAmount: number;

  @Field(_type => [Int])
  eligibleNetworks: number[];

  @Field(_type => Number, { nullable: true })
  allocatedFundUSD: number;

  @Field(_type => Number, { nullable: true })
  projectUsdAmountRaised: number;

  @Field(_type => Number, { nullable: true })
  uniqueDonors: number;

  @Field(_type => Number, { nullable: true })
  donationsCount: number;
}

@InputType()
export class QfArchivedRoundsOrderBy {
  @Field(_type => QfArchivedRoundsSortType)
  field: QfArchivedRoundsSortType;

  @Field(_type => OrderDirection)
  direction: OrderDirection;
}

@Service()
@ArgsType()
class QfArchivedRoundsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(_type => QfArchivedRoundsOrderBy, {
    defaultValue: {
      field: QfArchivedRoundsSortType.beginDate,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: QfArchivedRoundsOrderBy;
}

@Service()
@ArgsType()
export class QfRoundsArgs {
  @Field(_type => String, { nullable: true })
  slug?: string;

  @Field(_type => Boolean, { nullable: true })
  activeOnly?: boolean;

  @Field(_type => QfRoundsSortType, {
    nullable: true,
    defaultValue: QfRoundsSortType.roundId,
  })
  sortBy?: QfRoundsSortType;
}

@Resolver(_of => User)
export class QfRoundResolver {
  @Query(_returns => [QfRound], { nullable: true })
  async qfRounds(
    @Args()
    { slug, activeOnly, sortBy }: QfRoundsArgs,
  ) {
    if (activeOnly) {
      const activeQfRounds = await findActiveQfRounds();
      return activeQfRounds;
    }
    return findQfRounds({ slug, sortBy });
  }

  @Query(_returns => [QFArchivedRounds], { nullable: true })
  async qfArchivedRounds(
    @Args()
    { limit, skip, orderBy }: QfArchivedRoundsArgs,
  ): Promise<QFArchivedRounds[] | null> {
    return findArchivedQfRounds(limit, skip, orderBy);
  }

  @Query(_returns => User, { nullable: true })
  async scoreUserAddress(
    @Arg('address') address: string,
  ): Promise<User | undefined> {
    try {
      const user = await findUserByWalletAddress(address.toLowerCase());
      const activeQfRounds = await findActiveQfRounds();
      if (!user || !activeQfRounds || activeQfRounds.length === 0) return;

      const userScore = await getGitcoinAdapter().getUserAnalysisScore(
        address.toLowerCase(),
      );

      // Update user score for all active QF rounds
      for (const activeQfRound of activeQfRounds) {
        const existingRecord = await UserQfRoundModelScore.createQueryBuilder(
          'userQfRoundModelScore',
        )
          .where('"userId" = :userId', { userId: user.id })
          .andWhere('"qfRoundId" = :qfRoundId', {
            qfRoundId: activeQfRound.id,
          })
          .getOne();

        if (existingRecord) {
          await UserQfRoundModelScore.update(
            { id: existingRecord.id },
            { score: userScore },
          );
        } else {
          const userQfRoundScore = UserQfRoundModelScore.create({
            userId: user.id,
            qfRoundId: activeQfRound.id,
            score: userScore,
          });
          await userQfRoundScore.save();
        }
      }

      user.activeQFMBDScore = userScore;
      return user;
    } catch (e) {
      logger.error('scoreUserAddress error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  // This will be the formula data separated by parts so frontend
  // can calculate the estimated matching added per new donation
  @Query(() => ExpectedMatchingResponse, { nullable: true })
  async expectedMatching(
    @Arg('projectId') projectId: number,
  ): Promise<ExpectedMatchingResponse | null> {
    const activeQfRound = await findActiveQfRound();
    if (!activeQfRound) {
      return null;
    }

    const projectDonationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      projectId,
      activeQfRound.id,
    );

    const allProjectsSum = await getQfRoundTotalSqrtRootSumSquared(
      activeQfRound.id,
    );

    const matchingPool = activeQfRound.allocatedFund;

    return {
      projectDonationsSqrtRootSum,
      allProjectsSum,
      matchingPool,
    };
  }

  @Query(() => QfRoundStatsResponse, { nullable: true })
  async qfRoundStats(
    @Arg('slug') slug: string,
  ): Promise<QfRoundStatsResponse | null> {
    const qfRound = await findQfRoundBySlug(slug);
    if (!qfRound) {
      return null;
    }
    const { uniqueDonors, totalDonationUsd, donationsCount } =
      await getQfRoundStats(qfRound);
    return {
      uniqueDonors,
      donationsCount,
      allDonationsUsdValue: totalDonationUsd,
      matchingPool: qfRound.allocatedFund,
      qfRound,
    };
  }

  @Query(() => QfRoundSmartSelectResponse, { nullable: true })
  public async qfRoundSmartSelect(
    @Arg('networkId', () => Int) networkId: number,
    @Arg('projectId', () => Int) projectId: number,
  ): Promise<QfRoundSmartSelectResponse | null> {
    logger.info('qfRoundSmartSelect called with:', { networkId, projectId });
    try {
      return await selectQfRoundForProject(networkId, projectId);
    } catch (error) {
      if (error instanceof QfRoundSmartSelectError) {
        throw new Error(error.message);
      }
      logger.error('Error in qfRoundSmartSelect:', error);
      throw error;
    }
  }
}
