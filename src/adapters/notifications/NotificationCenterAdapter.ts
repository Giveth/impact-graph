import axios, { AxiosResponse } from 'axios';

import { NotificationAdapterInterface } from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { createBasicAuthentication } from '../../utils/utils';
import { logger } from '../../utils/logger';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
const notificationCenterUsername = process.env.NOTIFICATION_CENTER_USERNAME;
const notificationCenterPassword = process.env.NOTIFICATION_CENTER_PASSWORD;
const notificationCenterBaseUrl = process.env.NOTIFICATION_CENTER_BASE_URL;

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
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.MADE_DONATION,
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

  projectCancelled(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
    });
  }

  projectDeListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,
    });
  }

  projectDeactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
    });
  }

  projectListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.sendProjectRelatedNotification({
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
  }): Promise<void> {
    const { project, eventName, metadata } = params;
    return this.callSendNotification({
      eventName,
      email: project.adminUser?.email,
      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userWalletAddress: String(project.adminUser?.walletAddress),
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
