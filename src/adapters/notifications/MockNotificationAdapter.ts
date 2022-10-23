import { NotificationAdapterInterface } from './NotificationAdapterInterface';
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

  projectReceivedHeartReaction(params: { project: Project }): Promise<void> {
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
}
