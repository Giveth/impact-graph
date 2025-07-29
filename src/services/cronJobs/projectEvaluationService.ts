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
    // Raw query to get active causes with their included projects and categories
    const rawResults = await Cause.query(`
      SELECT 
        c.id as cause_id,
        c.title as cause_title,
        c.description as cause_description,
        cp."projectId",
        cat.name as category_name,
        cat.value as category_description,
        mc.title as maincategory_title,
        mc.description as maincategory_description
      FROM project c
      INNER JOIN cause_project cp ON c.id = cp."causeId"
      INNER JOIN project p ON cp."projectId" = p.id
      LEFT JOIN project_categories_category pcc ON c.id = pcc."projectId"
      LEFT JOIN category cat ON pcc."categoryId" = cat.id
      LEFT JOIN main_category mc ON cat."mainCategoryId" = mc.id
      WHERE c."projectType" = 'cause'
        AND c."statusId" = 5
        AND cp."userRemoved" = false
        AND cp."isIncluded" = true
        AND p."statusId" = 5
        AND (cat.id IS NULL OR cat."isActive" = true)
      ORDER BY c.id, cp."projectId", cat.id
    `);

    // Group results by cause
    const causesMap = new Map();

    rawResults.forEach(row => {
      const causeId = row.cause_id;

      if (!causesMap.has(causeId)) {
        causesMap.set(causeId, {
          cause: {
            id: causeId,
            title: row.cause_title,
            description: row.cause_description || '',
            categories: [],
          },
          projectIds: [],
        });
      }

      const causeData = causesMap.get(causeId);

      // Add project ID if not already added
      if (!causeData.projectIds.includes(row.projectId)) {
        causeData.projectIds.push(row.projectId);
      }

      // Add category if it exists and not already added
      if (row.category_name && row.maincategory_title) {
        const categoryExists = causeData.cause.categories.some(
          cat => cat.category_name === row.category_name,
        );

        if (!categoryExists) {
          causeData.cause.categories.push({
            category_name: row.category_name,
            category_description: row.category_description,
            maincategory_title: row.maincategory_title,
            maincategory_description: row.maincategory_description,
          });
        }
      }
    });

    // Convert map to array and filter out causes with no projects
    const causesWithProjects = Array.from(causesMap.values()).filter(
      cause => cause.projectIds.length > 0,
    );

    logger.debug('Found active causes with projects', {
      totalCauses: causesWithProjects.length,
    });

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
    });

    // Fire and forget - don't wait for response
    axios
      .post(`${evaluationServiceUrl}/evaluate/causes`, requestBody, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .catch(error => {
        // Only log errors, don't throw
        logger.error('Failed to send evaluation request:', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      });

    logger.debug('Evaluation request sent (fire and forget)');
  } catch (error: any) {
    logger.error('Error preparing evaluation request:', {
      error: error.message,
    });
  }
};
