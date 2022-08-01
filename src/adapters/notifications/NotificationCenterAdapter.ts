import axios, { AxiosResponse } from 'axios';

import { NotificationAdapterInterface } from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { createBasicAuthentication } from '../../utils/utils';
import { logger } from '../../utils/logger';
const notificationCenterUsername = process.env.NOTIFICATION_CENTER_USERNAME;
const notificationCenterPassword = process.env.NOTIFICATION_CENTER_PASSWORD;
const notificationCenterBaseUrl = process.env.NOTIFICATION_CENTER_BASE_URL;

interface SendNotificationBody {
  sendEmail: boolean;
  notificationTemplate: string;
  email?: string;
  metadata: any;
  projectId: string;
  userId: string;
}

enum NOTIFICATION_TEMPLATES {
  // TODO these notification templates should be created in notification-center
  DONATION_RECEIVED = 'donationReceived',
  DONATION_SENT = 'donationSent',
  PROJECT_VERIFIED = 'projectVerified',
  PROJECT_UNVERIFIED = 'projectUnverified',
  PROJECT_LISTED = 'projectListed',
  PROJECT_DE_LISTED = 'projectDeListed',
  PROJECT_CANCELLED = 'projectCancelled',
  PROJECT_PUBLISHED = 'projectPublished',
  PROJECT_DEACTIVATED = 'projectDeactivated',
  PROJECT_ACTIVATED = 'projectActivated',
  PROJECT_REACTIVATED = 'projectReactivated',
  PROJECT_SAVED_AS_DRAFT = 'projectSavedAsDraft',
  PROJECT_RECEIVED_HEART = 'projectReceivedHeart',
  PROFILE_IS_COMPLETED = 'ProfileIsCompleted',
  PROFILE_NEED_TO_BE_COMPLETED = 'ProfileNeedToBeCompleted',
}

export class NotificationCenterAdapter implements NotificationAdapterInterface {
  readonly authorizationHeader: string;
  constructor() {
    this.authorizationHeader = createBasicAuthentication({
      userName: notificationCenterUsername,
      password: notificationCenterPassword,
    });
  }

  async donationReceived(params: {
    donation: Donation;
    project: Project;
  }): Promise<void> {
    const { project, donation } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.DONATION_RECEIVED,
      additionalMetadata: {
        amount: donation.amount,
        currency: donation.currency,
        valueUsd: donation.valueUsd,
      },
    });
  }

  async donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void> {
    const { project, donation, donor } = params;

    return this.callSendNotification({
      notificationTemplate: NOTIFICATION_TEMPLATES.DONATION_SENT,
      email: donor?.email,

      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userId: String(donor.id),
      projectId: String(project.id),
      metadata: {
        amount: donation.amount,
        currency: donation.currency,
        valueUsd: donation.valueUsd,
        projectSlug: project.slug,
      },
    });
  }

  async projectVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_VERIFIED,
    });
  }

  async projectReceivedHeartReaction(params: {
    project: Project;
    user: User;
  }): Promise<void> {
    const { project, user } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_RECEIVED_HEART,
      additionalMetadata: {
        userName: user.name || 'Someone',
      },
    });
  }

  ProfileIsCompleted(params: { user: User }): Promise<void> {
    return Promise.resolve(undefined);
  }

  ProfileNeedToBeCompleted(params: { user: User }): Promise<void> {
    return Promise.resolve(undefined);
  }

  projectCancelled(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_CANCELLED,
    });
  }

  projectDeListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_DE_LISTED,
    });
  }

  projectDeactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_DEACTIVATED,
    });
  }

  projectListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_LISTED,
    });
  }

  projectPublished(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_PUBLISHED,
    });
  }

  projectReactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_REACTIVATED,
    });
  }

  projectSavedAsDraft(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_SAVED_AS_DRAFT,
    });
  }

  projectUnVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_UNVERIFIED,
    });
  }

  private async sendProjectRelatedNotification(params: {
    project: Project;
    notificationTemplate: NOTIFICATION_TEMPLATES;
    additionalMetadata?: any;
  }): Promise<void> {
    const { project, notificationTemplate, additionalMetadata } = params;
    return this.callSendNotification({
      notificationTemplate,
      email: project.adminUser?.email,
      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userId: String(project.adminUserId),
      projectId: String(project.id),
      metadata: {
        projectSlug: project.slug,
        ...additionalMetadata,
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
