import { Arg, Field, ObjectType, Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';
import { AppDataSource } from '../orm';
import {
  findActiveQfRound,
  findAllQfRounds,
} from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';

@ObjectType()
export class ExpectedMatchingResponse {
  @Field()
  projectDonationsSqrtRootSum: number;

  @Field()
  otherProjectsSum: number;

  @Field()
  matchingPool: number;
}

@Resolver(of => User)
export class QfRoundResolver {
  @Query(returns => [QfRound], { nullable: true })
  async qfRounds() {
    return findAllQfRounds();
  }

  // @Query(() => ExpectedMatchingResponse, { nullable: true })
  // async expectedMatching(
  //   @Arg('projectId') projectId: string,
  // ): Promise<ExpectedMatchingResponse | null> {
  //   const activeQfRound = await findActiveQfRound();
  //   if (activeQfRound === null) {
  //     return null;
  //   }
  // }
}
