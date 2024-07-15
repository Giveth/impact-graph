import Bull from 'bull';
import {
  getNotificationAdapter,
  getSuperFluidAdapter,
} from '../../adapters/adaptersFactory.js';
import config from '../../config.js';
import { RecurringDonation } from '../../entities/recurringDonation.js';
import { redisConfig } from '../../redis.js';
import { findUserById } from '../../repositories/userRepository.js';
import { logger } from '../../utils/logger.js';
import {
  findActiveRecurringDonations,
  findRecurringDonationById,
} from '../../repositories/recurringDonationRepository.js';
import { getCurrentDateFormatted } from '../../utils/utils.js';
import { getNetworkNameById, superTokens } from '../../provider.js';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics.js';

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
  const recurringDonation = await findRecurringDonationById(
    params.recurringDonationId,
  );
  logger.debug(
    `checkRecurringDonationBalances() has been called for id ${params.recurringDonationId}`,
  );
  if (!recurringDonation) return;
  await validateDonorSuperTokenBalance(recurringDonation);
};

const weekInSec = 60 * 60 * 24 * 7;
const monthInSec = 60 * 60 * 24 * 30;
export const validateDonorSuperTokenBalance = async (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  const user = await findUserById(recurringDonation.donorId);

  if (!user) return;

  const accountBalances = await superFluidAdapter.accountBalance(
    user.walletAddress!,
  );

  logger.debug(
    `validateDonorSuperTokenBalance for recurringDonation id ${recurringDonation.id}`,
    { accountBalances, userId: user.id },
  );

  if (!accountBalances || accountBalances.length === 0) return;

  for (const tokenBalance of accountBalances) {
    const { maybeCriticalAtTimestamp, token } = tokenBalance;
    if (!user!.email) continue;
    const tokenSymbol = superTokens.find(t => t.id === token.id)
      ?.underlyingToken.symbol;
    // We shouldn't notify the user if the token is not the same as the recurring donation
    if (tokenSymbol !== recurringDonation.currency) continue;
    const nowInSec = Number((Date.now() / 1000).toFixed());
    const balanceLongerThanMonth =
      Math.abs(nowInSec - maybeCriticalAtTimestamp) > monthInSec;
    if (balanceLongerThanMonth) {
      if (user.streamBalanceWarning) {
        user.streamBalanceWarning[tokenSymbol] = null;
        await user.save();
      }
      continue;
    }
    const balanceLongerThanWeek =
      Math.abs(nowInSec - maybeCriticalAtTimestamp) > weekInSec;

    const depletedBalance =
      maybeCriticalAtTimestamp === 0 || !maybeCriticalAtTimestamp;
    const eventName = depletedBalance
      ? NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_DEPLETED
      : balanceLongerThanWeek
        ? NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_MONTH
        : NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_WEEK;

    // If the balance warning is the same, we've already sent the notification
    if (
      user.streamBalanceWarning &&
      user.streamBalanceWarning[tokenSymbol] === eventName
    )
      continue;
    if (user.streamBalanceWarning) {
      user.streamBalanceWarning[tokenSymbol] = eventName;
    } else {
      user.streamBalanceWarning = {
        [tokenSymbol]: eventName,
      };
    }
    await user.save();
    // Notify user their super token is running out
    await getNotificationAdapter().userSuperTokensCritical({
      user,
      eventName,
      tokenSymbol: tokenSymbol!,
      isEnded: recurringDonation.finished,
      project: recurringDonation.project,
      networkName: getNetworkNameById(recurringDonation.networkId),
    });
  }
};
