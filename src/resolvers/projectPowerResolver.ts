import { Arg, Query, Resolver, Int } from 'type-graphql';
import { getPowerAmountRank } from '../repositories/projectPowerViewRepository';
import { ProjectPowerView } from '../views/projectPowerView';

@Resolver(of => ProjectPowerView)
export class ProjectPowerResolver {
  @Query(returns => Int)
  async powerAmountRank(
    @Arg('powerAmount', { nullable: false }) powerAmount: number,
    @Arg('projectId', type => Int, { nullable: true }) projectId: number,
  ): Promise<number> {
    return await getPowerAmountRank(powerAmount, projectId);
  }
}
