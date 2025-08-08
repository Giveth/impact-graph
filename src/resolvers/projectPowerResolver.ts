import { Arg, Query, Resolver, Int, Float } from 'type-graphql';
import {
  getPowerAmount,
  getPowerAmountRank,
} from '../repositories/projectPowerViewRepository';
import { ProjectPowerView } from '../views/projectPowerView';

@Resolver(_of => ProjectPowerView)
export class ProjectPowerResolver {
  @Query(_returns => Int)
  async powerAmountRank(
    @Arg('powerAmount', { nullable: false }) powerAmount: number,
    @Arg('projectId', _type => Int, { nullable: true }) projectId: number,
  ): Promise<number> {
    return await getPowerAmountRank(powerAmount, projectId);
  }

  @Query(_returns => Float, { nullable: true })
  async projectPowerAmount(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
  ): Promise<number | null> {
    return await getPowerAmount(projectId);
  }
}
