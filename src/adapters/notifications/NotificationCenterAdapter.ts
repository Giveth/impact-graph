import axios from 'axios';

import {
  BroadCastNotificationInputParams,
  NotificationAdapterInterface,
} from './NotificationAdapterInterface';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import {
  createBasicAuthentication,
  getTimestampInSeconds,
} from '../../utils/utils';
import { logger } from '../../utils/logger';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import Bull from 'bull';
import { redisConfig } from '../../redis';
import config from '../../config';
import { findUsersWhoDonatedToProjectExcludeWhoLiked } from '../../repositories/donationRepository';
import { findUsersWhoLikedProjectExcludeProjectOwner } from '../../repositories/reactionRepository';
import { findUsersWhoBoostedProject } from '../../repositories/powerBoostingRepository';
import { findProjectById } from '../../repositories/projectRepository';
import { findAllUsers } from '../../repositories/userRepository';
const notificationCenterUsername = process.env.NOTIFICATION_CENTER_USERNAME;
const notificationCenterPassword = process.env.NOTIFICATION_CENTER_PASSWORD;
const notificationCenterBaseUrl = process.env.NOTIFICATION_CENTER_BASE_URL;

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
      // load on notification-center and make sure all of notifications would arrive
      this.processSendingNotifications();
      isProcessingQueueEventsEnabled = true;
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
        const { project, metadata, eventName, user, trackId } = job.data;
        try {
          await sendProjectRelatedNotification({
            project,
            eventName,
            metadata,
            user,
            trackId,
          });
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
    donation: Donation;
    project: Project;
  }): Promise<void> {
    const { project, donation } = params;
    const user = project.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DONATION_RECEIVED,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentDonationAttributes({
          donation,
          project,
          user,
        }),
      },
    });
  }

  async donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void> {
    const { project, donor, donation } = params;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.MADE_DONATION,
      user: {
        email: donor.email,
        walletAddress: donor.walletAddress as string,
      },
      sendEmail: true,
      segment: {
        analyticsUserId: donor.segmentUserId(),
        anonymousId: donor.segmentUserId(),
        payload: {
          ...getSegmentDonationAttributes({
            donation,
            project,
            user: donor,
          }),

          // We just want this to be donation sent event not made donation, so don put it in getSegmentDonationAttributes()
          // see https://github.com/Giveth/impact-graph/pull/716
          fromWalletAddress: donation.fromWalletAddress.toLowerCase(),
        },
      },
    });
  }

  async projectVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project.adminUser as User;

    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED_USERS_WHO_LIKED,
        user,
      }),
    );

    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED,
      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
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
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BOOSTED,

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
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKED,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectBadgeRevokeReminder(params: {
    project: Project;
  }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_REMINDER,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectBadgeRevokeWarning(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_WARNING,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectBadgeRevokeLastWarning(params: {
    project: Project;
  }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_LAST_WARNING,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectBadgeUpForRevoking(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_UP_FOR_REVOKING,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectUnVerified(params: { project: Project }): Promise<void> {
    const { project } = params;
    const user = project.adminUser as User;

    const usersWhoBoosted = await findUsersWhoBoostedProject(project.id);
    usersWhoBoosted.map(u =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName:
          NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED_USERS_WHO_BOOSTED,
        user: u,
      }),
    );
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED,
      sendEmail: true,
      segment: {
        analyticsUserId: user.segmentUserId(),
        anonymousId: user.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectReceivedHeartReaction(params: {
    project: Project;
    userId: number;
  }): Promise<void> {
    const { project } = params;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_RECEIVED_HEART,

      // With adding trackId to notification, notification-center would not create new notification
      // If there is already a notification with this trackId in DB
      trackId: generateTrackId({
        userId: params.userId,
        projectId: project?.id as number,
        action: 'likeProject',
      }),
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

    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED_USERS_WHO_LIKED,
        user,
      }),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void> {
    const { project, update } = params;

    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UPDATED_DONOR,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UPDATED_USERS_WHO_LIKED,
        user,
      }),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UPDATED_OWNER,
      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: {
          ...getSegmentProjectAttributes({
            project,
          }),
          update,
        },
      },
    });
  }

  async projectDeListed(params: { project: Project }): Promise<void> {
    const { project } = params;

    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED_USERS_WHO_LIKED,
        user,
      }),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
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
    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED_DONORS,
        user,
        metadata,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName:
          NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED_USERS_WHO_LIKED,
        user,
        metadata,
      }),
    );

    const projectOwner = project?.adminUser as User;
    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
      metadata,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectListed(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;

    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectEdited(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;

    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_EDITED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }
  async projectGotDraftByAdmin(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;

    await sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.VERIFICATION_FORM_GOT_DRAFT_BY_ADMIN,
      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  projectPublished(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DRAFTED_PROJECT_ACTIVATED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  async projectReactivated(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;
    const donors = await findUsersWhoDonatedToProjectExcludeWhoLiked(
      project.id,
    );
    donors.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED_DONORS,
        user,
      }),
    );

    const usersWhoLiked = await findUsersWhoLikedProjectExcludeProjectOwner(
      project.id,
    );
    usersWhoLiked.map(user =>
      sendProjectRelatedNotificationsQueue.add({
        project,
        eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED_USERS_WHO_LIKED,
        user,
      }),
    );
    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  projectSavedAsDraft(params: { project: Project }): Promise<void> {
    const { project } = params;
    const projectOwner = project?.adminUser as User;

    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.PROJECT_CREATED,

      sendEmail: true,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
    });
  }

  donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void> {
    const { project, donationInfo } = params;
    const { txLink, reason } = donationInfo;
    const projectOwner = project?.adminUser as User;

    return sendProjectRelatedNotification({
      project,
      eventName: NOTIFICATIONS_EVENT_NAMES.DONATION_GET_PRICE_FAILED,
      metadata: {
        txLink,
        reason,
      },
      sendEmail: false,
      segment: {
        analyticsUserId: projectOwner.segmentUserId(),
        anonymousId: projectOwner.segmentUserId(),
        payload: getSegmentProjectAttributes({
          project,
        }),
      },
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
        queueData.notifications.push({
          email: user.email as string,
          eventName: NOTIFICATIONS_EVENT_NAMES.RAW_HTML_BROADCAST,
          sendEmail: false,
          sendSegment: false,
          metadata: {
            html,
          },
          userWalletAddress: user.walletAddress as string,
          trackId: `${trackIdPrefix}-${user.walletAddress}`,
        });
      }
      sendBroadcastNotificationsQueue.add(queueData);
    }
  }
}

const getSegmentDonationAttributes = (params: {
  user: User;
  project: Project;
  donation: Donation;
}) => {
  const { user, project, donation } = params;
  return {
    email: user.email,
    title: project.title,
    firstName: user.firstName,
    projectOwnerId: project.admin,
    slug: project.slug,
    amount: Number(donation.amount),
    transactionId: donation.transactionId.toLowerCase(),
    transactionNetworkId: Number(donation.transactionNetworkId),
    currency: donation.currency,
    createdAt: new Date(),
    toWalletAddress: donation.toWalletAddress.toLowerCase(),
    donationValueUsd: donation.valueUsd,
    donationValueEth: donation.valueEth,
    verified: Boolean(project.verified),
    transakStatus: donation.transakStatus,
  };
};

const getSegmentProjectAttributes = (params: { project: Project }) => {
  const { project } = params;
  return {
    email: project?.adminUser?.email,
    title: project.title,
    lastName: project?.adminUser?.lastName,
    firstName: project?.adminUser?.firstName,
    OwnerId: project?.adminUser?.id,
    slug: project.slug,
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
  segment?: SegmentData;
  sendEmail?: boolean;
  trackId?: string;
}): Promise<void> => {
  const { project, eventName, metadata, user, segment, sendEmail, trackId } =
    params;
  const receivedUser = user || (project.adminUser as User);
  const data: SendNotificationBody = {
    eventName,
    email: receivedUser.email,
    sendEmail: sendEmail || false,
    sendSegment: Boolean(segment),
    userWalletAddress: receivedUser.walletAddress as string,
    projectId: String(project.id),
    metadata: {
      projectTitle: project.title,
      projectLink: `${process.env.WEBSITE_URL}/project/${project.slug}`,
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
    await axios.post(`${notificationCenterBaseUrl}/notifications`, data, {
      headers: {
        Authorization: authorizationHeader(),
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
};

const callBatchNotification = async (
  data: SendBatchNotificationBody,
): Promise<void> => {
  try {
    await axios.post(`${notificationCenterBaseUrl}/notificationsBulk`, data, {
      headers: {
        Authorization: authorizationHeader(),
      },
    });
  } catch (e) {
    logger.error('callBatchNotification error', {
      errorResponse: e?.response?.data,
      data,
    });
    // We dont throw exception, because failing on sending notifications should not
    // affect on our application flow
  }
};

interface SegmentData {
  payload: any;
  analyticsUserId?: string;
  anonymousId?: string;
}

interface ProjectRelatedNotificationsQueue {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  metadata?: any;
  user?: {
    walletAddress: string;
    email?: string;
  };
  segment?: SegmentData;
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
  segment?: {
    payload: any;
    analyticsUserId?: string;
    anonymousId?: string;
  };
  trackId: string;
}
type SendBatchNotificationBody = { notifications: SendBatchNotificationItem[] };

interface SegmentData {
  payload: any;
  analyticsUserId?: string;
  anonymousId?: string;
}

interface ProjectRelatedNotificationsQueue {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  metadata?: any;
  user?: {
    walletAddress: string;
    email?: string;
  };
  segment?: SegmentData;
  trackId?: string;
}

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
  projectId: string;
  userWalletAddress: string;
  segment?: {
    payload: any;
    analyticsUserId?: string;
    anonymousId?: string;
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
