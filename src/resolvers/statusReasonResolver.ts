import { Arg, Int, Query, Resolver } from 'type-graphql';
import { ProjectStatusReason } from '../entities/projectStatusReason';

@Resolver(of => ProjectStatusReason)
export class StatusReasonResolver {
  @Query(returns => [ProjectStatusReason])
  async getStatusReasons(
    @Arg('statusId', { nullable: true }) statusId?: number,
  ) {
    const query = await ProjectStatusReason.createQueryBuilder(
      'project_status_reason',
    ).leftJoinAndSelect('project_status_reason.status', 'status');

    if (statusId) {
      query.where(`"statusId" = ${statusId}`);
    }
    return query.getMany();
  }
}
