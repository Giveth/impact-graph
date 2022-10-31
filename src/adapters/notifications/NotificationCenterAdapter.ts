import axios, { AxiosResponse } from 'axios';

import { NotificationAdapterInterface } from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { createBasicAuthentication } from '../../utils/utils';
import { logger } from '../../utils/logger';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import Bull from 'bull';
import { redisConfig } from '../../redis';
import config from '../../config';
import { findUsersWhoDonatedToProject } from '../../repositories/donationRepository';
import { findUsersWhoLikedProject } from '../../repositories/reactionRepository';
const notificationCenterUsername = process.env.NOTIFICATION_CENTER_USERNAME;
const notificationCenterPassword = process.env.NOTIFICATION_CENTER_PASSWORD;
const notificationCenterBaseUrl = process.env.NOTIFICATION_CENTER_BASE_URL;

const numberOfSendNotificationsConcurrentJob =
  Number(
    config.get('NUMBER_OF_FILLING_POWER_SNAPSHOT_BALANCE_CONCURRENT_JOB'),
  ) || 30;

interface ProjectRelatedNotificationsQueue {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  metadata?: any;
  user?: {
    walletAddress: string;
    email?: string;
  };
}

const sendProjectRelatedNotificationsBalanceQueue =
  new Bull<ProjectRelatedNotificationsQueue>(
    'send-project-related-notifications',
    {
      redis: redisConfig,
    },
  );
let isProcessingQueueEventsEnabled = false;

interface SendNotificationBody {
  sendEmail?: boolean;
  eventName: string;
  email?: string;
  metadata?: any;
  projectId: string;
  userWalletAddress: string;
}

export class NotificationCenterAdapter implements NotificationAdapterInterface {
  readonly authorizationHeader: string;
  constructor() {
    this.authorizationHeader = createBasicAuthentication({
      userName: notificationCenterUsername,
      password: notificationCenterPassword,
    });
    if (!isProcessingQueueEventsEnabled) {
      // We send notifications to project owners immediately, but as donors and people
      // who liked project can be thousands or more we enqueue them and send it by that to manage
      // load on notification-center and make sure all of notifications would arrive
      this.processSendingNotifications();
      isProcessingQueueEventsEnabled = true;
    }
  }

  processSendingNotifications() {
    logger.debug('processSendingNotifications() has been called ', {
      numberOfSendNotificationsConcurrentJob,
    });
    sendProjectRelatedNotificationsBalanceQueue.process(
      numberOfSendNotificationsConcurrentJob,
      async (job, done) => {
        logger.debug('processing send notification job', job.data);
        const { project, metadata, eventName, user } = job.data;
        try {
          await this.sendProjectRelatedNotification({
            project,
            eventName,
            metadata,
            user,
          });
        } catch (e) {
          logger.error('processSendingNotifications >> error', e);
        } finally {
          done();
        }
      },
    );
  }

  async donationReceived(params: {
    donation: Donation;
    project: Project;
  }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DONATION_RECEIVED,
    });
  }

  async donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void> {
    const { project, donor } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.MADE_DONATION,
      user: {
        email: donor.email,
        walletAddress: donor.walletAddress as string,
      },
    });
  }

  async projectVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED,
    });
  }

  async projectReceivedHeartReaction(params: {
    project: Project;
  }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_RECEIVED_HEART,
    });
  }

  ProfileIsCompleted(params: { user: User }): Promise<void> {
    return Promise.resolve(undefined);
  }

  ProfileNeedToBeCompleted(params: { user: User }): Promise<void> {
    return Promise.resolve(undefined);
  }

  async projectCancelled(params: { project: Project }): Promise<void> {
    const { project } = params;

    const donors = await findUsersWhoDonatedToProject(project.id);
    donors.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProject(project.id);
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED_USERS_WHO_LIKED,
        user,
      }),
    );

    await this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
    });
  }

  async projectDeListed(params: { project: Project }): Promise<void> {
    const { project } = params;

    const donors = await findUsersWhoDonatedToProject(project.id);
    donors.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProject(project.id);
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED_USERS_WHO_LIKED,
        user,
      }),
    );
    await this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,
    });
  }

  async projectDeactivated(params: {
    project: Project;
    reason?: string;
  }): Promise<void> {
    const { project, reason } = params;
    const metadata = {
      reason,
    };
    const donors = await findUsersWhoDonatedToProject(project.id);
    donors.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED_DONORS,
        user,
        metadata,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProject(project.id);
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsBalanceQueue.add({
        project,
        eventName:
          NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED_USERS_WHO_LIKED,
        user,
        metadata,
      }),
    );
    await this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
      metadata,
    });
  }

  async projectListed(params: { project: Project }): Promise<void> {
    const { project } = params;

    await this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED,
    });
  }

  projectPublished(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DRAFTED_PROJECT_ACTIVATED,
    });
  }

  projectReactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED,
    });
  }

  projectSavedAsDraft(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CREATED,
    });
  }

  projectUnVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED,
    });
  }

  private async sendProjectRelatedNotification(params: {
    project: Project;
    eventName: NOTIFICATIONS_EVENT_NAMES;
    metadata?: any;
    user?: {
      walletAddress: string;
      email?: string;
    };
  }): Promise<void> {
    const { project, eventName, metadata, user } = params;
    const receivedUser = user || (project.adminUser as User);
    return this.callSendNotification({
      eventName,
      email: receivedUser.email,
      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userWalletAddress: receivedUser.walletAddress as string,
      projectId: String(project.id),
      metadata: {
        projectTitle: project.title,
        projectLink: `${process.env.WEBSITE_URL}/project/${project.slug}`,
        ...metadata,
      },
    });
  }

  private async callSendNotification(
    data: SendNotificationBody,
  ): Promise<void> {
    try {
      await axios.post(`${notificationCenterBaseUrl}/notifications`, data, {
        headers: {
          Authorization: this.authorizationHeader,
        },
      });
    } catch (e) {
      logger.error('callSendNotification error', {
        errorResponse: e?.response?.data,
        data,
      });
      // We dont throw exception, because failing on sending notifications should not
      // affect on our application flow
    }
  }
}
