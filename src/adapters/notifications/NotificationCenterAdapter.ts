import axios from 'axios';
import Bull from 'bull';
import {
  BroadCastNotificationInputParams,
  NotificationAdapterInterface,
  OrttoPerson,
  ProjectsHaveNewRankingInputParam,
} from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { UserStreamBalanceWarning, User } from '../../entities/user';
import { createBasicAuthentication, isProduction } from '../../utils/utils';
import { logger } from '../../utils/logger';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import { redisConfig } from '../../redis';
import config from '../../config';
import { findProjectById } from '../../repositories/projectRepository';
import {
  findAllUsers,
  findUserById,
  findUsersWhoSupportProject,
} from '../../repositories/userRepository';
import { buildProjectLink } from './NotificationCenterUtils';
import { buildTxLink } from '../../utils/networks';
import { RecurringDonation } from '../../entities/recurringDonation';
import { getTokenPrice } from '../../services/priceService';
import { Token } from '../../entities/token';
import { toFixNumber } from '../../services/donationService';

const notificationCenterUsername = process.env.NOTIFICATION_CENTER_USERNAME;
const notificationCenterPassword = process.env.NOTIFICATION_CENTER_PASSWORD;
const notificationCenterBaseUrl = process.env.NOTIFICATION_CENTER_BASE_URL;
const disableNotificationCenter = process.env.DISABLE_NOTIFICATION_CENTER;
const dappUrl = process.env.FRONTEND_URL as string;

const numberOfSendNotificationsConcurrentJob =
  Number(
    config.get('NUMBER_OF_FILLING_POWER_SNAPSHOT_BALANCE_CONCURRENT_JOB'),
  ) || 30;

const sendBroadcastNotificationsQueue = new Bull<BroadcastNotificationsQueue>(
  'send-broadcast-notifications',
  {
    redis: redisConfig,
  },
);

export class NotificationCenterAdapter implements NotificationAdapterInterface {
  readonly authorizationHeader: string;
  constructor() {
    if (!isProcessingQueueEventsEnabled) {
      // We send notifications to project owners immediately, but as donors and people
      // who liked project can be thousands or more we enqueue them and send it by that to manage
      // load on notification-center and make sure all notifications would arrive
      this.processSendingNotifications();
      isProcessingQueueEventsEnabled = true;
    }
  }

  async subscribeOnboarding(params: { email: string }): Promise<void> {
    try {
      const { email } = params;
      if (!email) return;
      await callSendNotification({
        eventName: NOTIFICATIONS_EVENT_NAMES.SUBSCRIBE_ONBOARDING,
        segment: {
          payload: { email },
        },
      });
    } catch (e) {
      logger.error('subscribeOnboarding >> error', e);
    }
  }

  async sendEmailConfirmation(params: {
    email: string;
    project: Project;
    token: string;
  }): Promise<void> {
    const { email, project, token } = params;
    try {
      await callSendNotification({
        eventName: NOTIFICATIONS_EVENT_NAMES.SEND_EMAIL_CONFIRMATION,
        segment: {
          payload: {
            email,
            verificationLink: `${dappUrl}/verification/${project.slug}/${token}`,
          },
        },
      });
    } catch (e) {
      logger.error('sendEmailConfirmation >> error', e);
    }
  }

  async userSuperTokensCritical(params: {
    user: User;
    eventName: UserStreamBalanceWarning;
    tokenSymbol: string;
    project: Project;
    isEnded: boolean;
    networkName: string;
  }): Promise<void> {
    logger.debug('userSuperTokensCritical has been called', { params });
    const { eventName, tokenSymbol, project, user, isEnded, networkName } =
      params;
    const { email, walletAddress } = user;
    const payload = {
      userId: user.id,
      email: user.email,
      tokenSymbol,
      isEnded,
    };
    await sendProjectRelatedNotificationsQueue.add({
      project,
      user: {
        email,
        walletAddress: walletAddress!,
      },
      eventName,
      sendEmail: true,
      metadata: {
        ...payload,
        networkName,
        recurringDonationTab: `${process.env.WEBSITE_URL}/account?tab=recurring-donations`,
      },
      segment: {
        payload,
      },
    });
    return;
  }

  async createOrttoProfile(user: User): Promise<void> {
    try {
      const { id, email, firstName, lastName } = user;
      await callSendNotification({
        eventName: NOTIFICATIONS_EVENT_NAMES.CREATE_ORTTO_PROFILE,
        trackId: 'create-ortto-profile-' + user.id,
        userWalletAddress: user.walletAddress!,
        segment: {
          payload: { userId: id, email, firstName, lastName },
        },
      });
    } catch (e) {
      logger.error('createOrttoProfile >> error', e);
    }
  }

  async updateOrttoPeople(people: OrttoPerson[]): Promise<void> {
    // TODO we should me this to notification-center, it's not good that we call Ortto directly
    const merge_by: string[] = [];
    if (isProduction) {
      merge_by.push('str:cm:user-id');
    } else {
      merge_by.push('str::email');
    }
    try {
      const data = {
        people,
        async: false,
        merge_by,
      };
      logger.debug('updateOrttoPeople has been called:', people);
      const orttoConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: process.env.ORTTO_PERSON_API!,
        headers: {
          'X-Api-Key': process.env.ORTTO_API_KEY as string,
          'Content-Type': 'application/json',
        },
        data,
      };
      await axios.request(orttoConfig);
    } catch (e) {
      logger.error('updateOrttoPeople >> error', e);
    }
  }

  processSendingNotifications() {
    logger.debug('processSendingNotifications() has been called ', {
      numberOfSendNotificationsConcurrentJob,
    });
    sendProjectRelatedNotificationsQueue.process(
      numberOfSendNotificationsConcurrentJob,
      async (job, done) => {
        logger.debug('processing send notification job', job.data);
        try {
          await sendProjectRelatedNotification(job.data);
        } catch (e) {
          logger.error('processSendingNotifications >> error', e);
        } finally {
          done();
        }
      },
    );

    sendBroadcastNotificationsQueue.process(
      numberOfSendNotificationsConcurrentJob,
      async (job, done) => {
        logger.debug('processing send broadcast notifications job', job.data);
        try {
          await callBatchNotification(job.data);
        } catch (e) {
          logger.error('processSendingNotifications >> error', e);
        } finally {
          done();
        }
      },
    );
  }

  async donationReceived(params: {
    donation: Donation | RecurringDonation;
    project: Project;
    user: User | null;
  }): Promise<void> {
    const { project, donation, user } = params;
    const isRecurringDonation = donation instanceof RecurringDonation;
    let transactionId: string, transactionNetworkId: number;
    if (isRecurringDonation) {
      transactionId = donation.txHash;
      transactionNetworkId = donation.networkId;
      const token = await Token.findOneBy({
        symbol: donation.currency,
        networkId: transactionNetworkId,
      });
      const amount =
        (Number(donation.flowRate) / 10 ** (token?.decimals || 18)) * 2628000; // convert flowRate in wei from per second to per month
      const price = await getTokenPrice(transactionNetworkId, token!);
      const donationValueUsd = toFixNumber(amount * price, 4);
      logger.debug('donationReceived (recurring) has been called', {
        params,
        amount,
        price,
        donationValueUsd,
        token,
      });
      if (donationValueUsd <= 5) return;
    } else {
      transactionId = donation.transactionId;
      transactionNetworkId = donation.transactionNetworkId;
      const donationValueUsd = donation.valueUsd;
      logger.debug('donationReceived has been called', {
        params,
        transactionId,
        transactionNetworkId,
        donationValueUsd,
      });
      if (donationValueUsd <= 1) return;
    }

    await sendProjectRelatedNotificationsQueue.add({
      project,
      user: {
        email: user?.email as string,
        walletAddress: user?.walletAddress as string,
      },
      eventName: NOTIFICATIONS_EVENT_NAMES.DONATION_RECEIVED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataDonationAttributes({
          donation,
          project,
          user: user as User,
        }),
      },
      trackId:
        'donation-received-' +
        transactionNetworkId +
        '-' +
        transactionId +
        '-' +
        isRecurringDonation,
    });
  }

  async donationSent(): Promise<void> {
    return;
    // const { project, donor, donation } = params;
    // await sendProjectRelatedNotificationsQueue.add({
    //   project,
    //   eventName: projectEdited.MADE_DONATION,
    //   user: {
    //     email: donor.email,
    //     walletAddress: donor.walletAddress as string,
    //   },
    //   sendEmail: true,
    //   segment: {
    //     analyticsUserId: donor.segmentUserId(),
    //     anonymousId: donor.segmentUserId(),
    //     payload: {
    //       ...getSegmentDonationAttributes({
    //         donation,
    //         project,
    //         user: donor,
    //       }),

    //       // We just want this to be donation sent event not made donation, so don put it in getSegmentDonationAttributes()
    //       // see https://github.com/Giveth/impact-graph/pull/716
    //       fromWalletAddress: donation.fromWalletAddress.toLowerCase(),
    //     },
    //   },
    //   trackId:
    //     'donation-sent-' +
    //     donation.transactionNetworkId +
    //     '-' +
    //     donation.transactionId,
    // });
  }

  async projectVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project.adminUser as User;
    const now = new Date();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED_USERS_WHO_SUPPORT,
          user,
          trackId: `project-verified-${
            project.id
          }-${user.walletAddress.toLowerCase()}-${now}`,
        },
      })),
    );
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-verified-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectBoosted(params: {
    projectId: number;
    userId: number;
  }): Promise<void> {
    const { projectId, userId } = params;
    const project = (await findProjectById(projectId)) as Project;
    sendProjectRelatedNotificationsQueue.add({
      project: project as Project,
      eventName:
        project.adminUser?.id === userId
          ? // We send different notifications when project owner or someone else boost the project https://github.com/Giveth/notification-center/issues/41
            NOTIFICATIONS_EVENT_NAMES.PROJECT_BOOSTED_BY_PROJECT_OWNER
          : NOTIFICATIONS_EVENT_NAMES.PROJECT_BOOSTED,

      // With adding trackId to notification, notification-center would not create new notification
      // If there is already a notification with this trackId in DB
      trackId: generateTrackId({
        userId,
        projectId: project?.id as number,
        action: 'boostProject',
      }),
    });
  }

  async projectBoostedBatch(params: {
    projectIds: number[];
    userId: number;
  }): Promise<void> {
    const { userId, projectIds } = params;
    for (const projectId of projectIds) {
      await this.projectBoosted({
        userId,
        projectId,
      });
    }
  }

  async projectBadgeRevoked(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    const supporters = await findUsersWhoSupportProject(project.id);
    const now = new Date();
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(u => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED_USERS_WHO_SUPPORT,
          user: u,
          trackId: `project-unverified-${
            project.id
          }-${u.walletAddress.toLowerCase()}-${now}}`,
        },
      })),
    );
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-badge-revoked-${
        project.id
      }-${user?.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectBadgeRevokeReminder(params: {
    project: Project;
  }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    const now = new Date();
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_REMINDER,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-badge-revoke-reminder-${
        project.id
      }-${user?.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectBadgeRevokeWarning(params: { project: Project }): Promise<void> {
    const { project } = params;
    if (!project.adminUser?.email) {
      project.adminUser = (await findUserById(project.adminUserId))!;
    }
    const now = new Date();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_WARNING,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-badge-revoke-warning-${
        project.id
      }-${project.adminUser.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectBadgeRevokeLastWarning(params: {
    project: Project;
  }): Promise<void> {
    const { project } = params;
    if (!project.adminUser?.email) {
      project.adminUser = (await findUserById(project.adminUserId))!;
    }
    const now = Date.now();
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_LAST_WARNING,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-badge-revoke-last-warning-${
        project.id
      }-${project.adminUser?.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectBadgeUpForRevoking(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_UP_FOR_REVOKING,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-badge-up-for-revoking-${
        project.id
      }-${user?.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectUnVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    const now = Date.now();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(u => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED_USERS_WHO_SUPPORT,
          user: u,
          trackId: `project-unverified-${
            project.id
          }-${u.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-unverified-${
        project.id
      }-${user.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async verificationFormRejected(params: {
    project: Project;
    reason?: string;
  }): Promise<void> {
    const { project, reason } = params;
    const user = project.adminUser as User;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.VERIFICATION_FORM_REJECTED,
      sendEmail: true,
      segment: {
        payload: {
          ...(await getEmailDataProjectAttributes({
            project,
          })),
          verificationRejectedReason: reason,
        },
      },
      trackId: `verification-form-rejected-${
        project.id
      }-${user.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectReceivedHeartReaction(): Promise<void> {
    return;
    // const { project } = params;
    // await sendProjectRelatedNotificationsQueue.add({
    //   project,
    //   eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_RECEIVED_HEART,

    //   // With adding trackId to notification, notification-center would not create new notification
    //   // If there is already a notification with this trackId in DB
    //   trackId: generateTrackId({
    //     userId: params.userId,
    //     projectId: project?.id as number,
    //     action: 'likeProject',
    //   }),
    // });
  }

  ProfileIsCompleted(): Promise<void> {
    return Promise.resolve(undefined);
  }

  ProfileNeedToBeCompleted(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async projectCancelled(params: { project: Project }): Promise<void> {
    const { project } = params;
    const now = Date.now();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED_USERS_WHO_SUPPORT,
          user,
          trackId: `project-cancelled-${
            project.id
          }-${user.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-cancelled-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void> {
    const { project, update } = params;
    const now = Date.now();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_ADD_AN_UPDATE_USERS_WHO_SUPPORT,
          user,
          trackId: `project-update-added-${
            project.id
          }-${user.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );

    const projectOwner = project?.adminUser as User;
    const emailData = await getEmailDataProjectAttributes({ project });
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UPDATE_ADDED_OWNER,
      sendEmail: true,
      segment: {
        payload: {
          ...emailData,
          update,
        },
      },
      trackId: `project-update-added-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectDeListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    const now = Date.now();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED_SUPPORTED,
          user,
          trackId: `project-unlisted-${
            project.id
          }-${user.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-unlisted-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
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
    const now = Date.now();

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
      metadata,
      sendEmail: false,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-deactivated-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED_USERS_WHO_SUPPORT,
          user,
          metadata,
          trackId: `project-deactivated-${
            project.id
          }-${user.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );
  }

  async projectListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    const now = Date.now();

    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED_SUPPORTED,
          user,
          trackId: `project-listed-${
            project.id
          }-${user.walletAddress?.toLowerCase()}-${now}`,
        },
      })),
    );

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-listed-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  // commenting for now to test load of notification center.
  async projectEdited(): Promise<void> {
    return;
    // const { project } = params;
    // const projectOwner = project?.adminUser as User;
    // const now = Date.now();

    // await sendProjectRelatedNotificationsQueue.add({
    //   project,
    //   eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_EDITED,

    //   sendEmail: true,
    //   segment: {
    //     analyticsUserId: projectOwner.segmentUserId(),
    //     anonymousId: projectOwner.segmentUserId(),
    //     payload: getSegmentProjectAttributes({
    //       project,
    //     }),
    //   },
    //   trackId: `project-edited-${
    //     project.id
    //   }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    // });
  }
  async projectGotDraftByAdmin(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.VERIFICATION_FORM_GOT_DRAFT_BY_ADMIN,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-got-draft-by-admin-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectPublished(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DRAFTED_PROJECT_ACTIVATED,
      sendEmail: true,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-published-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async projectReactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    const now = Date.now();
    const supporters = await findUsersWhoSupportProject(project.id);
    await sendProjectRelatedNotificationsQueue.addBulk(
      supporters.map(user => ({
        data: {
          project,
          eventName:
            NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED_USERS_WHO_SUPPORT,
          user,
          trackId: `project-reactivated-${
            project.id
          }-${user.walletAddress.toLowerCase()}-${now}`,
        },
      })),
    );
  }

  async projectSavedAsDraft(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CREATED,
      sendEmail: false,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `project-saved-as-draft-${
        project.id
      }-${projectOwner.walletAddress?.toLowerCase()}-${now}`,
    });
  }

  async donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void> {
    const { project, donationInfo } = params;
    const { txLink, reason } = donationInfo;
    const now = Date.now();

    await sendProjectRelatedNotificationsQueue.add({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DONATION_GET_PRICE_FAILED,
      metadata: {
        txLink,
        reason,
      },
      sendEmail: false,
      segment: {
        payload: await getEmailDataProjectAttributes({
          project,
        }),
      },
      trackId: `donation-get-price-failed-${project.id}-${donationInfo.txLink}-${now}`,
    });
  }

  async broadcastNotification(
    params: BroadCastNotificationInputParams,
  ): Promise<void> {
    const { html, broadCastNotificationId } = params;
    let allUserFetched = false;
    const take = 100;
    let skip = 0;
    const trackIdPrefix = `broadCast-${broadCastNotificationId}`;
    while (!allUserFetched) {
      const { users } = await findAllUsers({ take, skip });
      if (users.length === 0) {
        allUserFetched = true;
        break;
      }
      skip += users.length;
      const queueData: SendBatchNotificationBody = { notifications: [] };
      for (const user of users) {
        // with adding .toLowerCase() to wallet address we make sure if two wallet address with different case
        // exist we would set same trackId for them
        const trackId = `${trackIdPrefix}-${user.walletAddress?.toLowerCase()}`;
        if (
          queueData.notifications.find(
            notificationData => notificationData.trackId === trackId,
          )
        ) {
          // We should not have items with repetitive trackIds in sending bulk notifications
          // and we may have some users with same wallet address, so we need to add this checking
          // https://github.com/Giveth/giveth-dapps-v2/issues/2084
          continue;
        }
        queueData.notifications.push({
          email: user.email as string,
          eventName: NOTIFICATIONS_EVENT_NAMES.RAW_HTML_BROADCAST,
          sendEmail: false,
          sendSegment: false,
          metadata: {
            html,
          },
          userWalletAddress: user.walletAddress as string,
          trackId,
        });
      }
      sendBroadcastNotificationsQueue.add(queueData);
    }
  }

  async projectsHaveNewRank(params: ProjectsHaveNewRankingInputParam) {
    for (const param of params.projectRanks) {
      const project = await findProjectById(param.projectId);
      if (!project) {
        continue;
      }
      let eventName;

      // https://github.com/Giveth/impact-graph/issues/774#issuecomment-1542337083
      if (
        param.oldRank === params.oldBottomRank &&
        param.newRank === params.newBottomRank
      ) {
        // We dont send any notification in this case, because project has no givPower so rank change doesnt matter
        continue;
      } else if (param.oldRank === params.oldBottomRank) {
        eventName = NOTIFICATIONS_EVENT_NAMES.YOUR_PROJECT_GOT_A_RANK;
      } else if (param.newRank < param.oldRank) {
        eventName = NOTIFICATIONS_EVENT_NAMES.PROJECT_HAS_RISEN_IN_THE_RANK;
      } else if (param.newRank > param.oldRank) {
        eventName = NOTIFICATIONS_EVENT_NAMES.PROJECT_HAS_A_NEW_RANK;
      }
      logger.debug('send rank changed notification ', {
        eventName,
        slug: project.slug,
        newRank: param.newRank,
        oldRank: param.oldRank,
        oldBottomRank: params.oldBottomRank,
        newBottomRank: params.newBottomRank,
      });
      await sendProjectRelatedNotificationsQueue.add({
        project,
        eventName,
        sendEmail: true,
        segment: {
          payload: await getEmailDataProjectAttributes({
            project,
          }),
        },
        trackId: `project-has-new-rank-${param.round}-${param.projectId}`,
      });
    }
  }
}

const getEmailDataDonationAttributes = async (params: {
  user: User;
  project: Project;
  donation: Donation | RecurringDonation;
}) => {
  const { user, project, donation } = params;
  const isRecurringDonation = donation instanceof RecurringDonation;
  let amount: number,
    transactionId: string,
    transactionNetworkId: number,
    toWalletAddress: string | undefined,
    donationValueUsd: number | undefined,
    donationValueEth: number | undefined,
    transakStatus: string | undefined;
  if (isRecurringDonation) {
    transactionId = donation.txHash;
    transactionNetworkId = donation.networkId;
    const token = await Token.findOneBy({
      symbol: donation.currency,
      networkId: transactionNetworkId,
    });
    amount =
      (Number(donation.flowRate) / 10 ** (token?.decimals || 18)) * 2628000; // convert flowRate in wei from per second to per month
  } else {
    amount = Number(donation.amount);
    transactionId = donation.transactionId;
    transactionNetworkId = donation.transactionNetworkId;
    toWalletAddress = donation.toWalletAddress.toLowerCase();
    donationValueUsd = donation.valueUsd;
    donationValueEth = donation.valueEth;
    transakStatus = donation.transakStatus;
  }
  return {
    email: user.email,
    title: project.title,
    firstName: user.firstName,
    userId: user.id,
    slug: project.slug,
    projectLink: `${process.env.WEBSITE_URL}/project/${project.slug}`,
    amount,
    isRecurringDonation,
    token: donation.currency,
    transactionId: transactionId.toLowerCase(),
    transactionNetworkId: Number(transactionNetworkId),
    transactionLink: buildTxLink(transactionId, transactionNetworkId),
    currency: donation.currency,
    createdAt: donation.createdAt,
    toWalletAddress,
    donationValueUsd,
    donationValueEth,
    verified: Boolean(project.verified),
    transakStatus,
  };
};

const getEmailDataProjectAttributes = async (params: { project: Project }) => {
  const { project } = params;
  let user: User | null;
  if (project.adminUser?.email) {
    user = project.adminUser;
  } else {
    user = await findUserById(project.adminUserId);
  }
  return {
    email: user?.email,
    title: project.title,
    lastName: project?.adminUser?.lastName || '',
    firstName: project?.adminUser?.firstName || '',
    userId: user?.id,
    projectLink: `${process.env.WEBSITE_URL}/project/${project.slug}`,
    OwnerId: project?.adminUser?.id,
    slug: project.slug,
  };
};

export const getOrttoPersonAttributes = (params: {
  firstName?: string;
  lastName?: string;
  email?: string;
  userId?: string;
  totalDonated?: number;
  donationsCount?: string;
  lastDonationDate?: Date | null;
  GIVbacksRound?: number;
  QFDonor?: string;
  QFProjectOwnerAdded?: string;
  QFProjectOwnerRemoved?: string;
  donationChain?: string;
}): OrttoPerson => {
  const {
    firstName,
    lastName,
    email,
    userId,
    totalDonated,
    donationsCount,
    lastDonationDate,
    GIVbacksRound,
    QFDonor,
    QFProjectOwnerAdded,
    QFProjectOwnerRemoved,
    donationChain,
  } = params;
  const fields = {
    'str::first': firstName || '',
    'str::last': lastName || '',
    'str::email': email || '',
  };
  if (isProduction) {
    // On production, we should update Ortto user profile based on user-id to avoid touching real users data
    fields['str:cm:user-id'] = userId;
  }
  if (donationsCount) {
    fields['int:cm:number-of-donations'] = Number(donationsCount);
  }
  if (totalDonated) {
    // Ortto automatically adds three decimal points to integers
    fields['int:cm:total-donations-value'] =
      Number(totalDonated?.toFixed(3)) * 1000;
  }
  if (lastDonationDate) {
    fields['dtz:cm:lastdonationdate'] = lastDonationDate;
  }
  const tags: string[] = [];
  const unsetTags: string[] = [];
  if (GIVbacksRound) {
    tags.push(`GIVbacks ${GIVbacksRound}`);
  }
  if (QFDonor) {
    tags.push(`QF Donor ${QFDonor}`);
  }
  if (QFProjectOwnerAdded) {
    tags.push(`QF Project Owner ${QFProjectOwnerAdded}`);
  }
  if (donationChain) {
    tags.push(`Donated on ${donationChain}`);
  }
  if (QFProjectOwnerRemoved) {
    unsetTags.push(`QF Project Owner ${QFProjectOwnerRemoved}`);
  }
  return {
    fields,
    tags,
    unset_tags: unsetTags,
  };
};

const sendProjectRelatedNotification = async (params: {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  metadata?: any;
  user?: {
    walletAddress: string;
    email?: string;
  };
  segment?: EmailData;
  sendEmail?: boolean;
  trackId?: string;
}): Promise<void> => {
  const { project, eventName, metadata, user, segment, sendEmail, trackId } =
    params;
  const receivedUser = user || (project.adminUser as User);
  const projectLink = buildProjectLink(eventName, project.slug);
  const data: SendNotificationBody = {
    eventName,
    email: segment?.payload?.email || receivedUser.email,
    sendEmail: sendEmail || false,
    sendSegment: Boolean(segment),
    userWalletAddress: receivedUser.walletAddress as string,
    projectId: String(project.id),
    metadata: {
      projectTitle: project.title,
      projectLink,
      ...metadata,
    },
    segment,
  };
  if (trackId) {
    data.trackId = trackId;
  }
  return callSendNotification(data);
};

const callSendNotification = async (
  data: SendNotificationBody,
): Promise<void> => {
  try {
    if (disableNotificationCenter !== 'true') {
      await axios.post(`${notificationCenterBaseUrl}/notifications`, data, {
        headers: {
          Authorization: authorizationHeader(),
        },
      });
    }
  } catch (e) {
    logger.error('callSendNotification error', {
      errorResponse: e?.response?.data,
      data,
    });
    // We dont throw exception, because failing on sending notifications should not
    // affect on our application flow
  }
};

const callBatchNotification = async (
  data: SendBatchNotificationBody,
): Promise<void> => {
  try {
    if (disableNotificationCenter !== 'true') {
      await axios.post(`${notificationCenterBaseUrl}/notificationsBulk`, data, {
        headers: {
          Authorization: authorizationHeader(),
        },
      });
    }
  } catch (e) {
    logger.error('callBatchNotification error', {
      errorResponse: e?.response?.data,
      data,
    });
    // We dont throw exception, because failing on sending notifications should not
    // affect on our application flow
  }
};

interface EmailData {
  payload: any;
}

interface ProjectRelatedNotificationsQueue {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  metadata?: any;
  user?: {
    walletAddress: string;
    email?: string;
  };
  segment?: EmailData;
  sendEmail?: boolean;
  trackId?: string;
}
interface BroadcastNotificationsQueue {
  notifications: SendBatchNotificationItem[];
}

interface SendBatchNotificationItem {
  sendEmail?: boolean;
  sendSegment?: boolean;
  eventName: string;
  email?: string;
  metadata?: any;
  userWalletAddress: string;
  emailData?: {
    payload: any;
  };
  trackId: string;
}
type SendBatchNotificationBody = { notifications: SendBatchNotificationItem[] };

const sendProjectRelatedNotificationsQueue =
  new Bull<ProjectRelatedNotificationsQueue>(
    'send-project-related-notifications',
    {
      redis: redisConfig,
    },
  );
let isProcessingQueueEventsEnabled = false;

interface SendNotificationBody {
  sendEmail?: boolean;
  sendSegment?: boolean;
  eventName: string;
  email?: string;
  trackId?: string;
  metadata?: any;
  projectId?: string;
  userWalletAddress?: string;
  segment?: {
    payload: any;
  };
}

const authorizationHeader = () => {
  return createBasicAuthentication({
    userName: notificationCenterUsername,
    password: notificationCenterPassword,
  });
};

const generateTrackId = (params: {
  userId: number;
  action: 'likeProject' | 'boostProject';
  projectId: number;
}): string => {
  return `${params.action}-${params.projectId}-${params.userId}`;
};
