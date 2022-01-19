import { Donation, DONATION_STATUS } from '../entities/donation';
import { getTransactionInfoFromNetwork } from './transactionService';
import { errorMessages } from '../utils/errorMessages';
import { schedule } from 'node-cron';

// @ts-ignore
// everything I used had problem so I had to add ts-ignore https://github.com/OptimalBits/bull/issues/1772
import Bull from 'bull';
import config from '../config';
import { redisConfig } from '../redis';
import { logger } from '../utils/logger';

const verifyDonationsQueue = new Bull('verify-donations-queue', {
  redis: redisConfig,
});
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const verifyDonationsQueueCount = await verifyDonationsQueue.count();
  logger.debug(`Verify donations job queues count:`, {
    verifyDonationsQueueCount,
  });
}, TWO_MINUTES);

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const numberOfVerifyDonationConcurrentJob =
  Number(config.get('NUMBER_OF_VERIFY_DONATION_CONCURRENT_JOB')) || 1;

const cronJobTime =
  (config.get('VERIFY_DONATION_CRONJOB_EXPRESSION') as string) || '0 0 * * * *';

export const runCheckPendingDonationsCronJob = () => {
  logger.debug('runCheckPendingDonationsCronJob() has been called');
  processVerifyDonationsJobs();
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addJobToCheckPendingDonationsWithNetwork();
  });
};

const addJobToCheckPendingDonationsWithNetwork = async () => {
  logger.debug('addJobToCheckPendingDonationsWithNetwork() has been called');

  const donations = await Donation.find({
    where: {
      status: DONATION_STATUS.PENDING,
      isFiat: false,
    },
    select: ['id'],
  });
  logger.debug('Pending donations to be check', donations.length);
  donations.forEach(donation => {
    logger.debug('Add pending donation to queue', { donationId: donation.id });
    verifyDonationsQueue.add({
      donationId: donation.id,
    });
  });
};

function processVerifyDonationsJobs() {
  logger.debug('processVerifyDonationsJobs() has been called');
  verifyDonationsQueue.process(
    numberOfVerifyDonationConcurrentJob,
    async (job, done) => {
      const { donationId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      const donation = await Donation.findOne(donationId);
      if (!donation) {
        throw new Error(errorMessages.DONATION_NOT_FOUND);
      }
      try {
        if (
          donation.toWalletAddress.toLowerCase() !==
          donation.project.walletAddress?.toLowerCase()
        ) {
          donation.verifyErrorMessage =
            errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS;
          donation.status = DONATION_STATUS.FAILED;
          await donation.save();
          return done();
        }
        const transaction = await getTransactionInfoFromNetwork({
          nonce: donation.nonce,
          networkId: donation.transactionNetworkId,
          toAddress: donation.toWalletAddress,
          fromAddress: donation.fromWalletAddress,
          amount: donation.amount,
          symbol: donation.currency,
          txHash: donation.transactionId,
          timestamp: donation.createdAt.getTime() / 1000,
        });
        donation.status = DONATION_STATUS.VERIFIED;
        if (transaction.hash !== donation.transactionId) {
          donation.speedup = true;
          donation.transactionId = transaction.hash;
        }
        await donation.save();
        logger.debug('donation and transaction', {
          transaction,
          donationId: donation.id,
        });
        done();
      } catch (e) {
        done();
        logger.debug('checkPendingDonations() error', {
          error: e,
          donationId: donation.id,
        });

        if (failedVerifiedDonationErrorMessages.includes(e.message)) {
          // if error message is in failedVerifiedDonationErrorMessages then we know we should change the status to failed
          // otherwise we leave it to be checked in next cycle
          donation.verifyErrorMessage = e.message;
          donation.status = DONATION_STATUS.FAILED;
          await donation.save();
        }
      }
    },
  );
}

const failedVerifiedDonationErrorMessages = [
  errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
  errorMessages.INVALID_NETWORK_ID,
  errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
];
