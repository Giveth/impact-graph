import { Arg, Int, Query, Resolver } from 'type-graphql';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from '../repositories/statusReasonRepository';
import { logger } from '../utils/logger';

@Resolver(of => ProjectStatusReason)
export class StatusReasonResolver {
  @Query(returns => [ProjectStatusReason])
  async getStatusReasons(
    @Arg('statusId', { nullable: true }) statusId?: number,
  ) {
    try {
      return statusId
        ? await findStatusReasonsByStatusId(statusId)
        : await findAllStatusReasons();
    } catch (e) {
      logger.error('getStatusReasons error', e);
      throw e;
    }
  }
}
