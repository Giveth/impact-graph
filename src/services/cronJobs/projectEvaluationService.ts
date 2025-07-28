import { schedule } from 'node-cron';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../utils/logger';
import { Cause } from '../../entities/project';

// Cron expression for how often to run the evaluation
const cronJobTime =
  (config.get('PROJECT_EVALUATION_CRONJOB_EXPRESSION') as string) ||
  '0 */2 * * *'; // Every minute by default

// Evaluation service URL
const evaluationServiceUrl =
  config.get('EVALUATION_SERVICE_URL') || 'https://staging.eval.ads.giveth.io';

export const runProjectEvaluationCronJob = () => {
  logger.debug(
    'runProjectEvaluationCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await evaluateAllCauses();
  });
};

export const evaluateAllCauses = async () => {
  logger.debug('evaluateAllCauses() has been called');

  try {
    // Get active causes with their projects
    const causesData = await getActiveCausesWithProjects();
    logger.debug('Active causes to evaluate', causesData.length);

    if (causesData.length === 0) {
      logger.debug('No active causes found for evaluation');
      return;
    }

    // Send evaluation request to the service
    await sendEvaluationRequest(causesData);
  } catch (error) {
    logger.error('Error in evaluateAllCauses:', error);
  }
};

export const getActiveCausesWithProjects = async () => {
  try {
    // Simple query to get active causes with their included projects
    const causes = await Cause.createQueryBuilder('cause')
      .leftJoinAndSelect(
        'cause.causeProjects',
        'causeProjects',
        'causeProject.causeId = cause.id',
      )
      .where('cause.projectType = :projectType', { projectType: 'cause' })
      .andWhere('cause.statusId = :statusId', { statusId: 5 }) // ProjStatus.active = 5
      .andWhere('causeProject.userRemoved = :userRemoved', {
        userRemoved: false,
      })
      .andWhere('causeProject.isIncluded = :isIncluded', { isIncluded: true })
      .getMany();

    // Transform to the required format
    const causesWithProjects = causes
      .map(cause => ({
        cause: {
          id: cause.id,
          title: cause.title,
          description: cause.description || '',
        },
        projectIds: (cause.causeProjects || []).map(cp => cp.project.id),
      }))
      .filter(cause => cause.projectIds.length > 0);

    return causesWithProjects;
  } catch (error) {
    logger.error('Error fetching active causes with projects:', error);
    throw error;
  }
};

const sendEvaluationRequest = async (causes: any[]) => {
  try {
    const requestBody = {
      causes,
    };

    logger.debug('Sending evaluation request to service', {
      url: `${evaluationServiceUrl}/evaluate/causes`,
      causeCount: causes.length,
      totalProjects: causes.reduce(
        (sum, cause) => sum + cause.projectIds.length,
        0,
      ),
    });

    const response = await axios.post(
      `${evaluationServiceUrl}/evaluate/causes`,
      requestBody,
      {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    logger.debug('Evaluation request sent successfully', {
      status: response.status,
      successfulCauses: response.data?.successfulCauses,
      failedCauses: response.data?.failedCauses,
    });
  } catch (error: any) {
    logger.error('Failed to send evaluation request:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Re-throw if it's a critical error that should break the process
    if (error.response?.status >= 500) {
      throw error;
    }
  }
};
