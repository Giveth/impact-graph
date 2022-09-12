import { schedule } from 'node-cron';
import {
  Project,
  ProjStatus,
  ProjectUpdate,
  RevokeSteps,
} from '../../entities/project';
import {
  getAnalytics,
  NOTIFICATIONS_EVENT_NAMES,
} from '../../analytics/analytics';
import { HISTORY_DESCRIPTIONS } from '../../entities/projectStatusHistory';
import { User } from '../../entities/user';
import config from '../../config';
import { logger } from '../../utils/logger';
import moment = require('moment');
import { projectsWithoutUpdateAfterTimeFrame } from '../../repositories/projectRepository';
import { errorMessages } from '../../utils/errorMessages';

const analytics = getAnalytics();

// Every 3 months if no project verification was added, the project
// Verification status will be revoked
// Every other month an email will be sent to notify owners to do updates
const cronJobTime =
  (config.get(
    'CHECK_PROJECT_VERIFICATION_STATUS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * 0';

const projectUpdatesReminderDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_REMINDER_DAYS') || 30,
);

const projectUpdatesWarningDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_WARNING_DAYS') || 60,
);

const projectUpdatesLastWarningDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_LAST_WARNING_DAYS') || 90,
);

const projectUpdatesRevokeVerificationDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_REVOKE_DAYS') || 104,
);

const projectUpdatesExpiredRevokeAdditionalDays = Number(
  config.get('PROJECT_UPDATES_EXPIRED_ADDITIONAL_REVOKE_DAYS') || 30,
);

const maxDaysForSendingUpdateReminder = moment()
  .subtract(projectUpdatesReminderDays, 'days')
  .endOf('day')
  .toDate();

const maxDaysForSendingUpdateWarning = moment()
  .subtract(projectUpdatesWarningDays, 'days')
  .endOf('day')
  .toDate();

const maxDaysForSendingUpdateLastWarning = moment()
  .subtract(projectUpdatesLastWarningDays, 'days')
  .endOf('day')
  .toDate();

const maxDaysForRevokingBadge = moment()
  .subtract(projectUpdatesRevokeVerificationDays, 'days')
  .endOf('day')
  .toDate();

export const runCheckProjectVerificationStatus = () => {
  logger.debug('runCheckProjectVerificationStatus() has been called');
  schedule(cronJobTime, async () => {
    await checkProjectVerificationStatus();
  });
};

export const checkProjectVerificationStatus = async () => {
  // all projects with last update created at 30+ days
  const projects = await projectsWithoutUpdateAfterTimeFrame(
    maxDaysForSendingUpdateReminder,
  );

  for (const project of projects) {
    await remindUpdatesOrRevokeVerification(project);
  }
};

const remindUpdatesOrRevokeVerification = async (project: Project) => {
  // Projects up for revoking when 30 days are done after feature release
  const lastChanceRevokeDate = new Date().setDate(
    maxDaysForSendingUpdateLastWarning.getDate() -
      projectUpdatesExpiredRevokeAdditionalDays,
  );
  if (
    project.projectUpdate.createdAt <= lastChanceRevokeDate &&
    project.verificationStatus === RevokeSteps.UpForRevoking
  ) {
    project.verificationStatus = RevokeSteps.Revoked;
    project.verified = false;
  } else if (
    // Projects that already expired verification are given a last chance
    // for this feature
    project.projectUpdate.createdAt <= maxDaysForSendingUpdateLastWarning &&
    project.verificationStatus === null
  ) {
    project.verificationStatus = RevokeSteps.UpForRevoking;
  } else if (
    // Projects that had the last chance and failed to add an update are revoked
    project.projectUpdate.createdAt <= maxDaysForRevokingBadge &&
    project.verificationStatus === RevokeSteps.LastChance
  ) {
    project.verificationStatus = RevokeSteps.Revoked;
    project.verified = false;
  } else if (
    // projects that were warned are sent a last chance warning
    project.projectUpdate.createdAt <= maxDaysForSendingUpdateLastWarning &&
    project.projectUpdate.createdAt > maxDaysForRevokingBadge &&
    project.verificationStatus === RevokeSteps.Warning
  ) {
    project.verificationStatus = RevokeSteps.LastChance;
  } else if (
    // After reminder at 60/75 days
    project.projectUpdate.createdAt <= maxDaysForSendingUpdateWarning &&
    project.projectUpdate.createdAt > maxDaysForSendingUpdateLastWarning
  ) {
    project.verificationStatus = RevokeSteps.Warning;
  } else if (
    // First email for reminding to add an update
    project.projectUpdate.createdAt <= maxDaysForSendingUpdateReminder &&
    project.projectUpdate.createdAt > maxDaysForSendingUpdateWarning
  ) {
    project.verificationStatus = RevokeSteps.Reminder;
  }

  await project.save();

  // save status changes history
  if (project.verificationStatus === RevokeSteps.Revoked) {
    await Project.addProjectStatusHistoryRecord({
      project,
      status: project.status,
      description: HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
    });
  }

  const user = await User.findOne({ where: { id: Number(project.admin) } });

  // segment notifications
  const segmentProject = {
    email: user?.email,
    title: project.title,
    lastName: user?.lastName,
    firstName: user?.firstName,
    OwnerId: user?.id,
    slug: project.slug,
    walletAddress: project.walletAddress,
    description: project.description,
  };

  analytics.track(
    selectSegmentEvent(project.verificationStatus),
    `givethId-${user?.id}`,
    segmentProject,
    null,
  );
};

const selectSegmentEvent = projectVerificationStatus => {
  switch (projectVerificationStatus) {
    case RevokeSteps.Reminder:
      return NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_REMINDER;
    case RevokeSteps.Warning:
      return NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_WARNING;
    case RevokeSteps.LastChance:
      return NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKE_LAST_WARNING;
    case RevokeSteps.Revoked:
      return NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKED;
    case RevokeSteps.UpForRevoking:
      return NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_UP_FOR_REVOKING;
    default:
      throw new Error(errorMessages.INVALID_VERIFICATION_REVOKE_STATUS);
  }
};
