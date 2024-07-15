import { schedule } from 'node-cron';
import moment from 'moment';
import { Project, RevokeSteps } from '../../entities/project.js';
import config from '../../config.js';
import { logger } from '../../utils/logger.js';
import { projectsWithoutUpdateAfterTimeFrame } from '../../repositories/projectRepository.js';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../utils/errorMessages.js';
import { getNotificationAdapter } from '../../adapters/adaptersFactory.js';

const cronJobTime =
  (config.get(
    'CHECK_PROJECT_VERIFICATION_STATUS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * 0';

const projectUpdatesWarningDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_WARNING_DAYS') || 45,
);

const projectUpdatesLastWarningDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_LAST_WARNING_DAYS') || 90,
);

const projectUpdatesRevokeVerificationDays = Number(
  config.get('PROJECT_UPDATES_VERIFIED_REVOKE_DAYS') || 104,
);

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
  // all projects with last update created at +45 days
  const projects = await projectsWithoutUpdateAfterTimeFrame(
    maxDaysForSendingUpdateWarning,
  );
  logger.debug('checkProjectVerificationStatus() has been called', {
    foundProjectsCount: projects.length,
    projects: projects.map(p => {
      return {
        slug: p.slug,
        verificationStatus: p.verificationStatus,
      };
    }),
  });

  for (const project of projects) {
    try {
      await remindUpdatesOrRevokeVerification(project);
    } catch (error) {
      logger.error('Error in remindUpdatesOrRevokeVerification', {
        projectId: project.id,
        projectVerificationStatus: project.verificationStatus,
        error,
      });
    }
  }
};

const remindUpdatesOrRevokeVerification = async (project: Project) => {
  // We don't revoke verification badge for any projects.
  if (
    !project ||
    !project.projectUpdates ||
    project.projectUpdates.length === 0
  ) {
    return;
  }
  const latestUpdate = project.projectUpdates[0].createdAt;
  logger.debug('remindUpdatesOrRevokeVerification() has been called', {
    projectId: project.id,
    projectVerificationStatus: project.verificationStatus,
    latestUpdate,
  });
  const { verificationStatus } = project;
  let newVerificationStatus = verificationStatus?.slice();
  if (
    (!verificationStatus || verificationStatus === RevokeSteps.Reminder) &&
    latestUpdate <= maxDaysForSendingUpdateWarning
  ) {
    newVerificationStatus = RevokeSteps.Warning;
  } else if (
    latestUpdate <= maxDaysForSendingUpdateLastWarning &&
    verificationStatus === RevokeSteps.Warning
  ) {
    newVerificationStatus = RevokeSteps.LastChance;
  } else if (
    latestUpdate <= maxDaysForRevokingBadge &&
    verificationStatus === RevokeSteps.LastChance
  ) {
    newVerificationStatus = RevokeSteps.UpForRevoking;
  }

  if (project.verificationStatus !== newVerificationStatus) {
    project.verificationStatus = newVerificationStatus?.slice();
    await project.save();
    await sendProperNotification(project, project.verificationStatus as string);
    logger.debug('remindUpdatesOrRevokeVerification() save project', {
      projectId: project.id,
      verificationStatus: project.verificationStatus,
    });
  }
};

const sendProperNotification = (
  project: Project,
  projectVerificationStatus: string,
) => {
  logger.debug('sendProperNotification()', {
    projectId: project.id,
    verificationStatus: project.verificationStatus,
  });
  switch (projectVerificationStatus) {
    // case RevokeSteps.Reminder:
    //   return getNotificationAdapter().projectBadgeRevokeReminder({ project });
    case RevokeSteps.Warning:
      return getNotificationAdapter().projectBadgeRevokeWarning({ project });
    case RevokeSteps.LastChance:
      return getNotificationAdapter().projectBadgeRevokeLastWarning({
        project,
      });
    case RevokeSteps.UpForRevoking:
      // No email or notification for UpForRevoking
      return;
    // case RevokeSteps.Revoked:
    //   return getNotificationAdapter().projectBadgeRevoked({ project });

    default:
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.INVALID_VERIFICATION_REVOKE_STATUS,
        ),
      );
  }
};
