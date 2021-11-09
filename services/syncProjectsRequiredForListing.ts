import { Project } from '../entities/project';
import { schedule } from 'node-cron';
import { getRepository } from 'typeorm';

// @ts-ignore
import config from '../config';

const cronJobTime =
  String(config.get('VERIFY_DONATION_CRONJOB_EXPRESSION')) || '0 0 * * *';

const maximumDaysForListing =
  Number(config.get('MAXIMUM_DAYS_FOR_LISTING_PROJECTS')) || 21;

export const runCheckPendingProjectListingCronJob = () => {
  console.log('runCheckPendingProjectListingCronJob() has been called');
  schedule(cronJobTime, async() => {
    await updateProjectListing();
  });
};

const updateProjectListing = async () => {
  const projects = await Project.pendingReviewSince(maximumDaysForListing)

  if (projects.length > 0) {
    const projectRepository = getRepository(Project);
    const updatedProjectsListing = projects.map(project => {
      return { id: project.id, listed: true }
    })

    await projectRepository.save(updatedProjectsListing)
  }
};
