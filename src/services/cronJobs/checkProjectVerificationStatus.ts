import { schedule } from 'node-cron';
import { Project, ProjStatus, ProjectUpdate } from '../../entities/project';
import {
  getAnalytics,
  NOTIFICATIONS_EVENT_NAMES,
} from '../../analytics/analytics';
import { HISTORY_DESCRIPTIONS } from '../../entities/projectStatusHistory';
import { User } from '../../entities/user';
import config from '../../config';
import { logger } from '../../utils/logger';
import moment = require('moment');
import { projectsWithoutStatusAfterTimeFrame } from '../../repositories/projectRepository';

const analytics = getAnalytics();

// Every 3 months if no project verification was added, the project
// Verification status will be revoked
// Every other month an email will be sent to notify owners to do updates
const cronJobTime =
  (config.get(
    'CHECK_PROJECT_VERIFICATION_STATUS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * 0';

const verifiedBadgeProjectUpdatesExpiryDays =
  Number(config.get('PROJECT_UPDATES_VERIFIED_BADGE_EXPIRATION_DAYS')) || 300;

const maxDaysForRevokingBadge = moment()
  .subtract(verifiedBadgeProjectUpdatesExpiryDays, 'days')
  .endOf('day');

export const runCheckProjectVerificationStatus = () => {
  logger.debug('runCheckProjectVerificationStatus() has been called');
  schedule(cronJobTime, async () => {
    await checkProjectVerificationStatus();
  });
};

export const checkProjectVerificationStatus = async () => {
  const projects = await projectsWithoutStatusAfterTimeFrame(
    maxDaysForRevokingBadge.toDate(),
  );

  for (const project of projects) {
    await revokeBadge(project);
  }
};

const revokeBadge = async (project: Project) => {
  const user = await User.findOne({ id: Number(project.admin) });
  project.verified = false;
  await project.save();

  // save status changes history
  Project.addProjectStatusHistoryRecord({
    project,
    status: project.status,
    description: HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
  });

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
    NOTIFICATIONS_EVENT_NAMES.PROJECT_BADGE_REVOKED,
    `givethId-${user?.id}`,
    segmentProject,
    null,
  );
};
