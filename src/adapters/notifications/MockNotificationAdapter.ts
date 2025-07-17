import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { RecurringDonation } from '../../entities/recurringDonation';
import { User } from '../../entities/user';
import { logger } from '../../utils/logger';
import {
  BroadCastNotificationInputParams,
  NotificationAdapterInterface,
  OrttoPerson,
  ProjectsHaveNewRankingInputParam,
} from './NotificationAdapterInterface';

export class MockNotificationAdapter implements NotificationAdapterInterface {
  async subscribeOnboarding(params: { email: string }): Promise<boolean> {
    logger.debug('MockNotificationAdapter subscribeOnboarding', params);
    return Promise.resolve(true);
  }

  async createOrttoProfile(params: User): Promise<void> {
    logger.debug('MockNotificationAdapter createOrttoProfile', params);
    return Promise.resolve(undefined);
  }

  async updateOrttoPeople(params: OrttoPerson[]): Promise<void> {
    logger.debug('MockNotificationAdapter updateOrttoPeople', params);
    return Promise.resolve(undefined);
  }

  async sendEmailConfirmation(params: {
    email: string;
    project: Project;
    token: string;
  }) {
    logger.debug('MockNotificationAdapter sendEmailConfirmation', params);
    return Promise.resolve(undefined);
  }

  sendUserEmailConfirmationCodeFlow(params: { email: string }): Promise<void> {
    logger.debug(
      'MockNotificationAdapter sendUserEmailConfirmationCodeFlow',
      params,
    );
    return Promise.resolve(undefined);
  }

  userSuperTokensCritical(): Promise<void> {
    return Promise.resolve(undefined);
  }

  donationReceived(params: {
    donation: Donation | RecurringDonation;
    project: Project;
  }): Promise<void> {
    if (params.donation instanceof RecurringDonation) {
      logger.debug('MockNotificationAdapter donationReceived', {
        projectSlug: params.project.slug,
        donationTxHash: params.donation.txHash,
        donationNetworkId: params.donation.networkId,
      });
      return Promise.resolve(undefined);
    }
    logger.debug('MockNotificationAdapter donationReceived', {
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
    logger.debug('MockNotificationAdapter donationSent', {
      projectSlug: params.project.slug,
      donationTxHash: params.donation.transactionId,
      donationNetworkId: params.donation.transactionNetworkId,
    });
    return Promise.resolve(undefined);
  }

  projectGivbacksEligible(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectGivbacksEligible', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectVerified(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectVerified', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBoosted(params: { projectId: number; userId: number }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBoosted', {
      projectId: params.projectId,
      userId: params.userId,
    });
    return Promise.resolve(undefined);
  }

  projectBoostedBatch(params: {
    projectIds: number[];
    userId: number;
  }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBoostedBatch', {
      projectIds: params.projectIds,
      userId: params.userId,
    });
    return Promise.resolve(undefined);
  }
  projectBadgeRevoked(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBadgeRevoked', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeReminder(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBadgeRevokeReminder', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeWarning(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBadgeRevokeWarning', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeUpForRevoking(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBadgeUpForRevoking', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectBadgeRevokeLastWarning(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectBadgeRevokeLastWarning', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectReceivedHeartReaction(params: {
    project: Project;
    userId: number;
  }): Promise<void> {
    logger.debug('MockNotificationAdapter projectReceivedHeartReaction', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  ProfileIsCompleted(params: { user: User }): Promise<void> {
    logger.debug('MockNotificationAdapter ProfileIsCompleted', {
      user: params.user,
    });
    return Promise.resolve(undefined);
  }

  ProfileNeedToBeCompleted(params: { user: User }): Promise<void> {
    logger.debug('MockNotificationAdapter ProfileNeedToBeCompleted', {
      user: params.user,
    });
    return Promise.resolve(undefined);
  }

  projectCancelled(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectCancelled', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }
  projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void> {
    logger.debug('MockNotificationAdapter projectUpdateAdded', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectDeListed(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectDeListed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectDeactivated(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectDeactivated', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectListed(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectListed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectPublished(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectPublished', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectEdited(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectEdited', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }
  projectGotDraftByAdmin(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectGotDraftByAdmin', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectReactivated(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectReactivated', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectSavedAsDraft(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectSavedAsDraft', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  projectUnVerified(params: { project: Project }): Promise<void> {
    logger.debug('MockNotificationAdapter projectUnVerified', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  verificationFormRejected(params: {
    project: Project;
    reason?: string;
  }): Promise<void> {
    logger.debug('MockNotificationAdapter verificationFormRejected', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void> {
    logger.debug('MockNotificationAdapter donationGetPriceFailed', {
      projectSlug: params.project.slug,
    });
    return Promise.resolve(undefined);
  }

  broadcastNotification(
    params: BroadCastNotificationInputParams,
  ): Promise<void> {
    logger.debug('MockNotificationAdapter broadcastNotification', params);
    return Promise.resolve(undefined);
  }

  projectsHaveNewRank(params: ProjectsHaveNewRankingInputParam): Promise<void> {
    logger.debug('MockNotificationAdapter projectHasNewRank', {
      params,
    });
    return Promise.resolve(undefined);
  }
}
