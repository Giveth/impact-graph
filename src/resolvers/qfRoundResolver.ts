import { Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';
import { AppDataSource } from '../orm';
import { findAllQfRounds } from '../repositories/qfRoundRepository';
import { QfRound } from '../entities/qfRound';

@Resolver(of => User)
export class QfRoundResolver {
  @Query(returns => [QfRound], { nullable: true })
  async qfRounds() {
    return findAllQfRounds();
  }
}
