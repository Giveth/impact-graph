import { Project } from '../../entities/project';
import { schedule } from 'node-cron';
import { getRepository } from 'typeorm';

import config from '../../config';
import { SegmentEvents } from '../../analytics/analytics';
import { logger } from '../../utils/logger';

const cronJobTime =
  (config.get('MAKE_UNREVIEWED_PROJECT_LISTED_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

const maximumDaysForListing =
  Number(config.get('MAXIMUM_DAYS_FOR_LISTING_PROJECTS')) || 21;

export const runCheckPendingProjectListingCronJob = () => {
  logger.debug(
    'runCheckPendingProjectListingCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await updateProjectListing();
  });
};

export const updateProjectListing = async () => {
  const projects = await Project.pendingReviewSince(maximumDaysForListing);
  for (const project of projects) {
    logger.debug(
      'updateProjectListing() convert project to listed, projectId:',
      project.id,
    );
    const projectRepository = getRepository(Project);
    await projectRepository.save({
      id: project.id,
      listed: true,
    });
    Project.notifySegment(project, SegmentEvents.PROJECT_LISTED);
  }
};
