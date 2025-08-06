import { schedule } from 'node-cron';
import axios from 'axios';
import { ethers } from 'ethers';
import config from '../../config';
import { logger } from '../../utils/logger';
import { Cause } from '../../entities/project';
import { erc20ABI } from '../../assets/erc20ABI';
import { getProvider } from '../../provider';

const tpolTokenAddress = '0xc7B1807822160a8C5b6c9EaF5C584aAD0972deeC'; // GIV token address for production
const givTokenAddress = '0xc20CAf8deE81059ec0c8E5971b2AF7347eC131f4'; // TPOL token address for staging

// Cron expression for how often to run the evaluation
const cronJobTime =
  (config.get('PROJECT_EVALUATION_CRONJOB_EXPRESSION') as string) ||
  '10 */2 * * *'; // Every 2 hours at 10 minutes past the hour

// Evaluation service URL
const evaluationServiceUrl =
  config.get('EVALUATION_SERVICE_URL') || 'https://staging.eval.ads.giveth.io';

// Cache for balance checks to avoid duplicate requests
const balanceCache = new Map<string, { value: string; timestamp: number }>();

// Cache TTL for balance checks
const BALANCE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Get the appropriate token address based on environment
const getDistributionTokenAddress = () => {
  const isStaging = config.get('NODE_ENV') === 'staging';
  return isStaging ? tpolTokenAddress : givTokenAddress;
};

// Check balance with caching
export const checkBalance = async (
  address: string,
  provider: ethers.providers.Provider,
): Promise<string> => {
  // Check cache first
  const cached = balanceCache.get(address);
  const now = Date.now();

  if (cached) {
    if (now - cached.timestamp < BALANCE_CACHE_TTL_MS) {
      return cached.value;
    } else {
      balanceCache.delete(address); // remove expired entry
    }
  }

  try {
    const distributionTokenAddress = getDistributionTokenAddress();
    const distributionTokenContract = new ethers.Contract(
      distributionTokenAddress,
      erc20ABI,
      provider,
    );
    const balanceWei = await distributionTokenContract.balanceOf(address);
    const balance = ethers.utils.formatEther(balanceWei);

    // Cache the result
    balanceCache.set(address, { value: balance, timestamp: now });

    return balance;
  } catch (error) {
    logger.error('Error checking balance for address:', address, error);
    throw error;
  }
};

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
        c.id AS cause_id,
        c.title AS cause_title,
        c.description AS cause_description,
        ca.address AS cause_address,
        cp."projectId",
        -- Aggregate all category-related info into a single JSON array
        JSON_AGG(
          -- Create a JSON object for each category
          DISTINCT jsonb_build_object(
            'category_name', cat.name,
            'category_description', cat.value,
            'maincategory_title', mc.title,
            'maincategory_description', mc.description
          )
        ) FILTER (WHERE cat.id IS NOT NULL) AS categories -- FILTER ignores NULLs from the LEFT JOIN
      FROM 
        project c
        INNER JOIN cause_project cp ON c.id = cp."causeId"
        INNER JOIN project p ON cp."projectId" = p.id
        INNER JOIN project_address ca ON c.id = ca."projectId" AND ca."networkId" = 137
        LEFT JOIN project_categories_category pcc ON c.id = pcc."projectId"
        LEFT JOIN category cat ON pcc."categoryId" = cat.id
        LEFT JOIN main_category mc ON cat."mainCategoryId" = mc.id
      WHERE 
        c."projectType" = 'cause'
        AND c."statusId" = 5
        AND cp."userRemoved" = false
        AND cp."isIncluded" = true
        AND p."statusId" = 5
        AND p.verified = true
        AND (cat.id IS NULL OR cat."isActive" = true)
      -- Group by all the non-aggregated columns
      GROUP BY 
        c.id,
        cp."projectId",
        ca.address 
      ORDER BY 
        c.id, 
        cp."projectId";
    `);

    // Get provider for balance checking
    const provider = await getProvider(137); // Polygon network

    // Group results by cause and check balances
    const causesMap = new Map();

    for (const row of rawResults) {
      // Skip if the cause has no balance
      try {
        const balance = await checkBalance(row.cause_address, provider);
        const balanceNumber = parseFloat(balance);
        if (balanceNumber <= 0.1) {
          continue;
        }
      } catch (error) {
        logger.error(
          `Error checking balance for cause ${row.cause_address}:`,
          error,
        );
        // continue cause evaluation when the balance check fails
      }

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
    }

    // Convert map to array and filter out causes with no projects
    const causesWithProjects = Array.from(causesMap.values()).filter(
      cause => cause.projectIds.length > 0,
    );

    logger.debug('Found active causes with projects and balances', {
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
    await axios
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
