import { schedule } from 'node-cron';
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';

const projectEvaluationQueue = new Bull('project-evaluation-queue', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

const TWO_MINUTES = 1000 * 60 * 2;

// Log queue status every 2 minutes
setInterval(async () => {
  const projectEvaluationQueueCount = await projectEvaluationQueue.count();
  logger.debug(`Project evaluation job queues count:`, {
    projectEvaluationQueueCount,
  });
}, TWO_MINUTES);

// Number of concurrent jobs to process
const numberOfProjectEvaluationConcurrentJob =
  Number(config.get('NUMBER_OF_PROJECT_EVALUATION_CONCURRENT_JOB')) || 1;

// Cron expression for how often to run the evaluation
const cronJobTime =
  (config.get('PROJECT_EVALUATION_CRONJOB_EXPRESSION') as string) || '* * * * *'; // Every minute by default

export const runProjectEvaluationCronJob = () => {
  logger.debug(
    'runProjectEvaluationCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processProjectEvaluationJobs();
  schedule(cronJobTime, async () => {
    await addJobToProjectEvaluation();
  });
};

const addJobToProjectEvaluation = async () => {
  logger.debug('addJobToProjectEvaluation() has been called');

  // TODO: Get projects that need evaluation from database
  // const projectsToEvaluate = await getProjectsToEvaluate();
  // logger.debug('Projects to evaluate', projectsToEvaluate.length);

  // projectsToEvaluate.forEach(project => {
  //   logger.debug('Add project to evaluation queue', { projectId: project.id });
  //   projectEvaluationQueue.add(
  //     {
  //       projectId: project.id,
  //     },
  //     {
  //       jobId: `evaluate-project-id-${project.id}`,
  //       removeOnComplete: true,
  //       removeOnFail: true,
  //     },
  //   );
  // });
};

function processProjectEvaluationJobs() {
  logger.debug('processProjectEvaluationJobs() has been called');
  projectEvaluationQueue.process(
    numberOfProjectEvaluationConcurrentJob,
    async (job, done) => {
      const { projectId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await evaluateProject(projectId);
        done();
      } catch (e) {
        logger.error(
          'processProjectEvaluationJobs >> evaluateProject error',
          e,
        );
        done();
      }
    },
  );
}

const evaluateProject = async (projectId: number) => {
  try {
    // TODO: Get project from database
    // const project = await getProjectById(projectId);
    // if (!project) {
    //   throw new Error('Project not found');
    // }

    // TODO: Implement project evaluation logic
    // const evaluationResult = await performProjectEvaluation(project);

    // TODO: Update project with evaluation results
    // await updateProjectEvaluation(projectId, evaluationResult);

    logger.debug(`Project evaluation completed for project ${projectId}`);
  } catch (error) {
    logger.error('Error evaluating project:', error);
    throw error;
  }
};

// TODO: Add any helper functions needed for project evaluation
// const performProjectEvaluation = async (project: any) => {
//   // Implementation here
// }; 