import {
  Arg,
  Args,
  ArgsType,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Service } from 'typedi';
import { Max, Min } from 'class-validator';
import { User } from '../entities/user';
import {
  findActiveQfRound,
  findAllQfRounds,
  findArchivedQfRounds,
  findQfRoundBySlug,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';
import { OrderBy, OrderDirection } from './projectResolver';
import { OrderField } from '../entities/project';

@ObjectType()
export class QfRoundStatsResponse {
  @Field()
  uniqueDonors: number;

  @Field()
  allDonationsUsdValue: number;

  @Field()
  matchingPool: number;
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

  @Field(_type => OrderBy, {
    defaultValue: {
      field: OrderField.GIVPower,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: OrderBy;
}

@Resolver(_of => User)
export class QfRoundResolver {
  @Query(_returns => [QfRound], { nullable: true })
  async qfRounds() {
    return findAllQfRounds();
  }

  @Query(() => [QfRound], { nullable: true })
  async qfArchivedRounds(
    @Args()
    { limit, skip, orderBy }: QfArchivedRoundsArgs,
  ): Promise<QfRound[] | null> {
    return findArchivedQfRounds(limit, skip, orderBy);
  }

  // This will be the formula data separated by parts so frontend
  // can calculate the estimated matchin added per new donation
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

    const allProjectsSum = await getQfRoundTotalProjectsDonationsSum(
      activeQfRound.id,
    );

    const matchingPool = activeQfRound.allocatedFund;

    return {
      projectDonationsSqrtRootSum: projectDonationsSqrtRootSum.sqrtRootSum,
      allProjectsSum: allProjectsSum.sum,
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
    const { totalDonationsSum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    return {
      uniqueDonors: contributorsCount,
      allDonationsUsdValue: totalDonationsSum,
      matchingPool: qfRound.allocatedFund,
    };
  }
}
