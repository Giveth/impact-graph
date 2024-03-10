import Bull from 'bull';
import {
  getNotificationAdapter,
  getSuperFluidAdapter,
} from '../../adapters/adaptersFactory';
import config from '../../config';
import { RecurringDonation } from '../../entities/recurringDonation';
import { superTokensToToken } from '../../provider';
import { redisConfig } from '../../redis';
import { findUserById } from '../../repositories/userRepository';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import {
  findActiveRecurringDonations,
  findRecurringDonationById,
} from '../../repositories/recurringDonationRepository';
import { getCurrentDateFormatted } from '../../utils/utils';

const runCheckUserSuperTokenBalancesQueue = new Bull(
  'user-token-balances-stream-queue',
  {
    redis: redisConfig,
  },
);

const numberOfUpdateRecurringDonationsStreamConcurrentJob =
  Number(config.get('NUMBER_OF_CHECK_USER_SUPER_TOKEN_BALANCES_JOB')) || 1;

const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const superTokenBalancesQueueCount =
    await runCheckUserSuperTokenBalancesQueue.count();
  logger.debug(`Check User token Balances queues count:`, {
    superTokenBalancesQueueCount,
  });
}, TWO_MINUTES);

export const runCheckUserSuperTokenBalances = async () => {
  logger.debug('runCheckUserSuperTokenBalances() has been called');

  const recurringDonations = await findActiveRecurringDonations();
  logger.debug('Active recurring donations length', recurringDonations.length);
  recurringDonations.forEach(recurringDonation => {
    logger.debug('Add pending recurringDonation to queue', {
      recurringDonationId: recurringDonation.id,
    });
    runCheckUserSuperTokenBalancesQueue.add(
      {
        recurringDonationId: recurringDonation.id,
      },
      {
        // Because we want to run this job once per day so we need to add the date to the job id
        jobId: `update-recurring-donations-stream-queue-${getCurrentDateFormatted()}-${
          recurringDonation.id
        }`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

export function processRecurringDonationBalancesJobs() {
  logger.debug('processRecurringDonationBalancesJobs() has been called');
  runCheckUserSuperTokenBalancesQueue.process(
    numberOfUpdateRecurringDonationsStreamConcurrentJob,
    async (job, done) => {
      const { recurringDonationId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await checkRecurringDonationBalances({ recurringDonationId });
        done();
      } catch (e) {
        logger.error('processRecurringDonationBalancesJobs error', e);
        done();
      }
    },
  );
}

export const checkRecurringDonationBalances = async (params: {
  recurringDonationId: number;
}) => {
  logger.debug(
    'checkRecurringDonationBalances() has been called for id',
    params.recurringDonationId,
  );
  const recurringDonation = await findRecurringDonationById(
    params.recurringDonationId,
  );

  if (!recurringDonation) return;
  await validateDonorSuperTokenBalance(recurringDonation);
};

export const validateDonorSuperTokenBalance = async (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  const user = await findUserById(recurringDonation.donorId);

  if (user) return;

  const accountBalances = await superFluidAdapter.accountBalance(
    user!.walletAddress!,
  );
  for (const tokenBalance of accountBalances.accountTokenSnapshots) {
    if (
      Object.keys(superTokensToToken).includes(tokenBalance.token.symbol) &&
      tokenBalance.maybeCriticalAtTimestamp
    ) {
      if (!user!.email) continue;
      // Notify user their super token is running out
      await getNotificationAdapter().userSuperTokensCritical({
        userId: user!.id,
        email: user!.email,
        criticalDate: tokenBalance.maybeCriticalAtTimestamp,
        tokensymbol: tokenBalance.token.symbol,
      });
    }
  }
};
