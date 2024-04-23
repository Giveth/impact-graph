import { schedule } from 'node-cron';
import moment = require('moment');
import { Project, RevokeSteps } from '../../entities/project';
import { HISTORY_DESCRIPTIONS } from '../../entities/projectStatusHistory';
import config from '../../config';
import { logger } from '../../utils/logger';
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
    maxDaysForSendingUpdateWarning,
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
  // We don't revoke verification badge for any projects.
  const latestUpdate =
    project.projectUpdates?.[0].createdAt || project.updatedAt;
  logger.debug('remindUpdatesOrRevokeVerification() has been called', {
    projectId: project.id,
    projectSlug: project.slug,
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
      slug: project.slug,
      verificationStatus: project.verificationStatus,
    });
  }

  // draft the verification form to allow to reapply
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
