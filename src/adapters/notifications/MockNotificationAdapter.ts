import {
  BroadCastNotificationInputParams,
  NotificationAdapterInterface,
} from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { logger } from '../../utils/logger';

export class MockNotificationAdapter implements NotificationAdapterInterface {
  donationReceived(params: {
    donation: Donation;
    project: Project;
  }): Promise<void> {
    logger.info('MockNotificationAdapter donationReceived', {
      projectSlug: params.project.slug,
      donationTxHash: params.donation.transactionId,
      donationNetworkId: params.donation.transactionNetworkId,
    });
    return Promise.resolve(undefined);
  }

  donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void> {
    logger.info('MockNotificationAdapter donationSent', {
      projectSlug: params.project.slug,
      donationTxHash: params.donation.transactionId,
      donationNetworkId: params.donation.transactionNetworkId,
    });
    return Promise.resolve(undefined);
  }

  projectVerified(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectVerified', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBoosted(params: { projectId: number; userId: number }): Promise<void> {
    logger.info('MockNotificationAdapter projectBoosted', {
      projectId: params.projectId,
      userId: params.userId,
    });
    return Promise.resolve(undefined);
  }

  projectBoostedBatch(params: {
    projectIds: number[];
    userId: number;
  }): Promise<void> {
    logger.info('MockNotificationAdapter projectBoostedBatch', {
      projectIds: params.projectIds,
      userId: params.userId,
    });
    return Promise.resolve(undefined);
  }
  projectBadgeRevoked(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectBadgeRevoked', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeReminder(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectBadgeRevokeReminder', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeWarning(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectBadgeRevokeWarning', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeUpForRevoking(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectBadgeUpForRevoking', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeLastWarning(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectBadgeRevokeLastWarning', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectReceivedHeartReaction(params: {
    project: Project;
    userId: number;
  }): Promise<void> {
    logger.info('MockNotificationAdapter projectReceivedHeartReaction', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  ProfileIsCompleted(params: { user: User }): Promise<void> {
    logger.info('MockNotificationAdapter ProfileIsCompleted', {
      user: params.user,
    });
    return Promise.resolve(undefined);
  }

  ProfileNeedToBeCompleted(params: { user: User }): Promise<void> {
    logger.info('MockNotificationAdapter ProfileNeedToBeCompleted', {
      user: params.user,
    });
    return Promise.resolve(undefined);
  }

  projectCancelled(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectCancelled', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }
  projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void> {
    logger.info('MockNotificationAdapter projectUpdateAdded', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectDeListed(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectDeListed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectDeactivated(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectDeactivated', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectListed(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectListed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectPublished(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectPublished', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectEdited(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectEdited', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }
  projectGotDraftByAdmin(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectGotDraftByAdmin', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectReactivated(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectReactivated', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectSavedAsDraft(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectSavedAsDraft', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectUnVerified(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectUnVerified', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void> {
    logger.info('MockNotificationAdapter donationGetPriceFailed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  broadcastNotification(
    params: BroadCastNotificationInputParams,
  ): Promise<void> {
    logger.info('MockNotificationAdapter broadcastNotification', params);
    return Promise.resolve(undefined);
  }
}
