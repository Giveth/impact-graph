import { schedule } from 'node-cron';
import { Project } from '../../entities/project';

import config from '../../config';
import { logger } from '../../utils/logger';
import { getNotificationAdapter } from '../../adapters/adaptersFactory';
import { makeProjectListed } from '../../repositories/projectRepository';

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
    await makeProjectListed(project.id);
    await getNotificationAdapter().projectListed({ project });
  }
};
