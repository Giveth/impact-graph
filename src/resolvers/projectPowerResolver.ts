import { Arg, Query, Resolver, Int } from 'type-graphql';
import { getPowerAmountRank } from '../repositories/projectPowerViewRepository.js';
import { ProjectPowerView } from '../views/projectPowerView.js';

@Resolver(_of => ProjectPowerView)
export class ProjectPowerResolver {
  @Query(_returns => Int)
  async powerAmountRank(
    @Arg('powerAmount', { nullable: false }) powerAmount: number,
    @Arg('projectId', _type => Int, { nullable: true }) projectId: number,
  ): Promise<number> {
    return await getPowerAmountRank(powerAmount, projectId);
  }
}
