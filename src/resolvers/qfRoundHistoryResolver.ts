import { Arg, Int, Query, Resolver } from 'type-graphql';
import { QfRoundHistory } from '../entities/qfRoundHistory.js';
import { getQfRoundHistory } from '../repositories/qfRoundHistoryRepository.js';

@Resolver(_of => QfRoundHistory)
export class QfRoundHistoryResolver {
  @Query(() => QfRoundHistory, { nullable: true })
  async getQfRoundHistory(
    @Arg('projectId', () => Int, { nullable: true }) projectId: number,
    @Arg('qfRoundId', () => Int, { nullable: true }) qfRoundId: number,
  ): Promise<QfRoundHistory | null> {
    return getQfRoundHistory({
      projectId,
      qfRoundId,
    });
  }
}
