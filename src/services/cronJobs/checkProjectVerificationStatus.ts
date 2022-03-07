import { schedule } from 'node-cron';
import { Project, ProjStatus, ProjectUpdate } from '../../entities/project';
import { getAnalytics, SegmentEvents } from '../../analytics/analytics';
import { User } from '../../entities/user';
import config from '../../config';
import { logger } from '../../utils/logger';
import moment = require('moment');

const analytics = getAnalytics();

// Every 3 months if no project verification was added, the project
// Verification status will be revoked
// Every other month an email will be sent to notify owners to do updates
const cronJobTime =
  (config.get(
    'CHECK_PROJECT_VERIFICATION_STATUS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * 0';

const cronJobStartingDay = config.get(
  'CHECK_PROJECT_VERIFICATION_STATUS_START_DATE',
) as string;

const maxDaysForRevokingBadge = moment().subtract(90, 'days').endOf('day');

export const runCheckProjectVerificationStatus = () => {
  logger.debug('runCheckProjectVerificationStatus() has been called');
  if (cronJobStartingDay && new Date(cronJobStartingDay) <= new Date()) {
    schedule(cronJobTime, async () => {
      await checkProjectVerificationStatus();
    });
  }
};

const checkProjectVerificationStatus = async () => {
  const projects = await Project.createQueryBuilder('project')
    .innerJoinAndSelect(
      ProjectUpdate,
      'projectUpdate',
      'project.id = projectUpdate.projectId',
    )
    .innerJoinAndSelect(
      ProjectUpdate,
      'nextUpdate',
      'project.id = nextUpdate.projectId AND projectUpdate.createdAt < nextUpdate.createdAt',
    )
    .where('project.isImported = true AND nextUpdate.id IS NULL')
    .andWhere('projectUpdate.createdAt < :badgeRevokingDate', {
      badgeRevokingDate: maxDaysForRevokingBadge,
    })
    .getMany();

  for (const project of projects) {
    await revokeBadge(project);
  }
};

const revokeBadge = async (project: Project) => {
  const user = await User.findOne({ id: Number(project.admin) });
  project.verified = false;
  await project.save();

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
    SegmentEvents.PROJECT_BADGE_REVOKED,
    `givethId-${user?.id}`,
    segmentProject,
    null,
  );
};
