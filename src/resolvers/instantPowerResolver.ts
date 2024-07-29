import { Arg, Field, Int, ObjectType, Query, Resolver } from 'type-graphql';

import { ProjectUserInstantPowerView } from '../views/projectUserInstantPowerView.js';
import { getProjectUserInstantPowerView } from '../repositories/instantBoostingRepository.js';

@ObjectType()
class PaginatedProjectUserInstantPowerView {
  @Field(() => [ProjectUserInstantPowerView])
  projectUserInstantPowers: ProjectUserInstantPowerView[];

  @Field(() => Int)
  total: number;
}
@Resolver()
export class ProjectUserInstantPowerViewResolver {
  @Query(() => PaginatedProjectUserInstantPowerView, { nullable: true })
  async getProjectUserInstantPower(
    @Arg('projectId', () => Int, { nullable: false }) projectId: number,
    @Arg('take', _type => Int, { nullable: true }) take?: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip?: number,
  ): Promise<PaginatedProjectUserInstantPowerView | null> {
    const [projectUserInstantPowers, total] =
      await getProjectUserInstantPowerView(projectId, take, skip);
    return {
      projectUserInstantPowers,
      total,
    };
  }
}
