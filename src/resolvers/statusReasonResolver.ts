import { Arg, Query, Resolver } from 'type-graphql';
import { ProjectStatusReason } from '../entities/projectStatusReason.js';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from '../repositories/statusReasonRepository.js';
import { logger } from '../utils/logger.js';

@Resolver(_of => ProjectStatusReason)
export class StatusReasonResolver {
  @Query(_returns => [ProjectStatusReason])
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
