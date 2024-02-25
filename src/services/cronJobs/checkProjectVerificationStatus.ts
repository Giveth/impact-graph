import { schedule } from 'node-cron';
import { Project, RevokeSteps } from '../../entities/project';
import { HISTORY_DESCRIPTIONS } from '../../entities/projectStatusHistory';
import { User } from '../../entities/user';
import config from '../../config';
import { logger } from '../../utils/logger';
import moment = require('moment');
import { projectsWithoutUpdateAfterTimeFrame } from '../../repositories/projectRepository';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

import { makeFormDraft } from '../../repositories/projectVerificationRepository';
import { sleep } from '../../utils/utils';
import { getNotificationAdapter } from '../../adapters/adaptersFactory';
import { refreshUserProjectPowerView } from '../../repositories/userProjectPowerViewRepository';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../../repositories/projectPowerViewRepository';

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

const projectUpdatesFirstRevokeBatchDate = String(
  config.get('PROJECT_UPDATES_FIRST_REVOKE_BATCH_DATE') || '2022-10-22',
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
  logger.debug('checkProjectVerificationStatus()', {
    maxDaysForSendingUpdateReminder,
    foundProjectsCount: projects?.length,
  });

  for (const project of projects) {
    try {
      await remindUpdatesOrRevokeVerification(project);
    } catch (error) {
      logger.error('Error in remindUpdatesOrRevokeVerification', {
        projectId: project.id,
        projectSlug: project.slug,
        projectVerificationStatus: project.verificationStatus,
        error,
      });
    }
  }

  if (projects.length > 0) {
    await Promise.all([
      refreshUserProjectPowerView(),
      refreshProjectPowerView(),
      refreshProjectFuturePowerView(),
    ]);
  }
};

const remindUpdatesOrRevokeVerification = async (project: Project) => {
  logger.debug('remindUpdatesOrRevokeVerification() has been called', {
    projectId: project.id,
    projectSlug: project.slug,
    projectVerificationStatus: project.verificationStatus,
  });
  // Projects up for revoking when 30 days are done after feature release
  if (
    new Date() >= new Date(projectUpdatesFirstRevokeBatchDate) &&
    project.verificationStatus === RevokeSteps.UpForRevoking
  ) {
    project.verificationStatus = RevokeSteps.Revoked;
    project.verified = false;
  } else if (
    // Projects that already expired verification are given a last chance
    // for this feature
    project.updatedAt <= maxDaysForSendingUpdateLastWarning &&
    project.verificationStatus === null
  ) {
    project.verificationStatus = RevokeSteps.UpForRevoking;
  } else if (
    // Projects that had the last chance and failed to add an update are revoked
    project.updatedAt <= maxDaysForRevokingBadge &&
    project.verificationStatus === RevokeSteps.LastChance
  ) {
    project.verificationStatus = RevokeSteps.Revoked;
    project.verified = false;
  } else if (
    // projects that were warned are sent a last chance warning
    project.updatedAt <= maxDaysForSendingUpdateLastWarning &&
    project.updatedAt > maxDaysForRevokingBadge &&
    project.verificationStatus === RevokeSteps.Warning
  ) {
    project.verificationStatus = RevokeSteps.LastChance;
  } else if (
    // After reminder at 60/75 days
    project.updatedAt <= maxDaysForSendingUpdateWarning &&
    project.updatedAt > maxDaysForSendingUpdateLastWarning &&
    project.verificationStatus !== RevokeSteps.Warning
  ) {
    project.verificationStatus = RevokeSteps.Warning;
  } else if (
    // First email for reminding to add an update
    project.updatedAt <= maxDaysForSendingUpdateReminder &&
    project.updatedAt > maxDaysForSendingUpdateWarning &&
    project.verificationStatus !== RevokeSteps.Reminder
  ) {
    project.verificationStatus = RevokeSteps.Reminder;
  }

  await project.save();
  logger.debug('remindUpdatesOrRevokeVerification() save project', {
    projectId: project.id,
    slug: project.slug,
    verificationStatus: project.verificationStatus,
  });

  // draft the verification form to allow reapply
  if (
    project.projectVerificationForm &&
    project.verificationStatus === RevokeSteps.Revoked
  ) {
    await makeFormDraft({
      formId: project.projectVerificationForm.id,
    });
  }

  // save status changes history
  if (project.verificationStatus === RevokeSteps.Revoked) {
    await Project.addProjectStatusHistoryRecord({
      project,
      status: project.status,
      description: HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
    });
  }

  const user = await User.findOne({ where: { id: Number(project.admin) } });

  await sendProperNotification(project, project.verificationStatus as string);
  await sleep(300);
};

const sendProperNotification = (
  project: Project,
  projectVerificationStatus: string,
) => {
  logger.debug('sendProperNotification()', {
    projectId: project.id,
    slug: project.slug,
    verificationStatus: project.verificationStatus,
  });
  switch (projectVerificationStatus) {
    case RevokeSteps.Reminder:
      return getNotificationAdapter().projectBadgeRevokeReminder({ project });
    case RevokeSteps.Warning:
      return getNotificationAdapter().projectBadgeRevokeWarning({ project });
    case RevokeSteps.LastChance:
      return getNotificationAdapter().projectBadgeRevokeLastWarning({
        project,
      });
    case RevokeSteps.Revoked:
      return getNotificationAdapter().projectBadgeRevoked({ project });
    case RevokeSteps.UpForRevoking:
      return getNotificationAdapter().projectBadgeUpForRevoking({ project });

    default:
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.INVALID_VERIFICATION_REVOKE_STATUS,
        ),
      );
  }
};
