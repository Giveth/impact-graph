import axios, { AxiosResponse } from 'axios';

import { NotificationAdapterInterface } from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { createBasicAuthentication } from '../../utils/utils';
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
      },
    });
    return Promise.resolve(undefined);
  }

  async donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void> {
    return Promise.resolve(undefined);
  }

  async projectGotVerified(params: { project: Project }): Promise<void> {
    return Promise.resolve(undefined);
  }

  async projectReceivedHeartReaction(params: {
    project: Project;
    user: User;
  }): Promise<void> {
    return Promise.resolve(undefined);
  }

  private async callSendNotification(
    data: SendNotificationBody,
  ): Promise<void> {
    await axios.post(`${notificationCenterBaseUrl}/notifications`, data, {
      headers: {
        Authorization: this.authorizationHeader,
      },
    });
  }
}
