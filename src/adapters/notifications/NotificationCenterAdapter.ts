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

const NOTIFICATION_TEMPLATES = {
  DONATION_RECEIVED: 'donationReceived',
  DONATION_SENT: 'donationSent',
  PROJECT_GOT_VERIFIED: 'projectVerified',
  PROJECT_RECEIVED_HEART: 'projectReceivedHeart',
};

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
    return this.callSendNotification({
      notificationTemplate: NOTIFICATION_TEMPLATES.DONATION_RECEIVED,
      email: project.adminUser?.email,

      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userId: String(project.adminUserId),
      projectId: String(project.id),
      metadata: {
        amount: donation.amount,
        currency: donation.currency,
        valueUsd: donation.valueUsd,
        projectSlug: project.slug,
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

  async projectGotVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    return this.callSendNotification({
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_GOT_VERIFIED,
      email: project.adminUser?.email,

      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userId: String(project.adminUserId),
      projectId: String(project.id),
      metadata: {
        projectSlug: project.slug,
      },
    });
  }

  async projectReceivedHeartReaction(params: {
    project: Project;
    user: User;
  }): Promise<void> {
    const { project } = params;
    return this.callSendNotification({
      notificationTemplate: NOTIFICATION_TEMPLATES.PROJECT_RECEIVED_HEART,
      email: project.adminUser?.email,

      // currently Segment handle sending emails, so notification-center doesnt need to send that
      sendEmail: false,
      userId: String(project.adminUserId),
      projectId: String(project.id),
      metadata: {
        projectSlug: project.slug,
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
      throw e;
    }
  }
}
