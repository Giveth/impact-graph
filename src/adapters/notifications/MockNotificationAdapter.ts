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

  projectGotVerified(params: { project: Project }): Promise<void> {
    logger.info('MockNotificationAdapter projectGotVerified', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectReceivedHeartReaction(params: {
    project: Project;
    user: User;
  }): Promise<void> {
    logger.info('MockNotificationAdapter projectReceivedHeartReaction', {
      projectSlug: params.project.slug,
      user: params.user,
    });
    return Promise.resolve(undefined);
  }
}
