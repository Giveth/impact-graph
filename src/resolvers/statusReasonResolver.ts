import { Arg, Query, Resolver, Int } from 'type-graphql';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from '../repositories/statusReasonRepository';
import { logger } from '../utils/logger';

@Resolver(_of => ProjectStatusReason)
export class StatusReasonResolver {
  @Query(_returns => [ProjectStatusReason])
  async getStatusReasons(
    @Arg('statusId', _type => Int, { nullable: true, defaultValue: 6 })
    statusId?: number,
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
