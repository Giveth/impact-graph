import { schedule } from 'node-cron';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../utils/logger';
import { DraftDonation } from '../../entities/draftDonation';
import { Token } from '../../entities/token';
import {
  createDonation,
  findDonationsByTransactionId,
} from '../../repositories/donationRepository';
import { findProjectById } from '../../repositories/projectRepository';
import { updateDraftDonationStatus } from '../../repositories/draftDonationRepository';
import { CoingeckoPriceAdapter } from '../../adapters/price/CoingeckoPriceAdapter';
import { findUserById } from '../../repositories/userRepository';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import {
  selectQfRoundForProject,
  QfRoundSmartSelectError,
} from '../qfRoundSmartSelectService';
import { QfRound } from '../../entities/qfRound';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { notifyClients } from '../sse/sse';
import { calculateGivbackFactor } from '../givbackService';

const STELLAR_HORIZON_API =
  (config.get('STELLAR_HORIZON_API_URL') as string) ||
  'https://horizon.stellar.org';
const cronJobTime =
  (config.get('CHECK_QR_TRANSACTIONS_CRONJOB_EXPRESSION') as string) ||
  '0 */1 * * * *';

const getPendingDraftDonations = async () => {
  return await DraftDonation.createQueryBuilder('draftDonation')
    .where('draftDonation.status = :status', { status: 'pending' })
    .andWhere('draftDonation.isQRDonation = true')
    .getMany();
};

const getToken = async (
  chainType: string,
  symbol: string,
): Promise<Token | null> => {
  return await Token.createQueryBuilder('token')
    .where('token.chainType = :chainType', { chainType })
    .andWhere('token.isQR = true')
    .andWhere('token.symbol = :symbol', { symbol })
    .getOne();
};

// Check for transactions
export async function checkTransactions(
  donation: DraftDonation,
): Promise<void> {
  const { toWalletAddress, amount, toWalletMemo, expiresAt, id } = donation;

  try {
    if (!toWalletAddress || !amount) {
      logger.debug(`Missing required fields for donation ID ${donation.id}`);
      return;
    }

    const now = Date.now();
    const expiresAtDate = new Date(expiresAt!).getTime() + 1 * 60 * 1000;

    if (now > expiresAtDate) {
      logger.debug(`Donation ID ${id} has expired. Updating status to expired`);
      await updateDraftDonationStatus({
        donationId: id,
        status: 'failed',
      });
      return;
    }

    const response = await axios.get(
      `${STELLAR_HORIZON_API}/accounts/${toWalletAddress}/payments?limit=200&order=desc&join=transactions&include_failed=true`,
    );

    const transactions = response.data._embedded.records;
    if (!transactions.length) return;

    for (const transaction of transactions) {
      const transactionCreatedAt = new Date(transaction.created_at).getTime();
      const transactionAge = Date.now() - transactionCreatedAt;

      const TWO_MINUTES = 2 * 60 * 1000;

      const isNativePayment =
        transaction.asset_type === 'native' &&
        transaction.type === 'payment' &&
        transaction.to === toWalletAddress &&
        Number(transaction.amount) === amount;

      const isCreateAccount =
        transaction.type === 'create_account' &&
        transaction.account === toWalletAddress &&
        Number(transaction.starting_balance) === amount;

      const isMatchingTransaction =
        (isNativePayment || isCreateAccount) && transactionAge < TWO_MINUTES;

      if (isMatchingTransaction) {
        const memo = transaction.transaction.memo;

        if (transaction.type === 'payment') {
          if (toWalletMemo) {
            if (memo !== toWalletMemo) {
              logger.debug(
                `Transaction memo does not match donation memo for donation ID ${donation.id}`,
              );
              return;
            }
          } else if (memo !== id.toString()) {
            logger.debug(
              `Transaction memo matches donation memo for donation ID ${donation.id}`,
            );
            return;
          }
        }

        // Check if donation already exists
        const existingDonation = await findDonationsByTransactionId(
          transaction.transaction_hash?.toLowerCase(),
        );
        if (existingDonation) return;

        // Retrieve token object
        const token = await getToken('STELLAR', 'XLM');
        if (!token) {
          logger.debug('Token not found for donation ID', donation.id);
          return;
        }

        // Retrieve project object
        const project = await findProjectById(donation.projectId);
        if (!project) {
          logger.debug(`Project not found for donation ID ${donation.id}`);
          return;
        }

        // Get token price
        const tokenPrice = await new CoingeckoPriceAdapter().getTokenPrice({
          symbol: token.coingeckoId,
          networkId: token.networkId,
        });

        // Retrieve donor object
        const donor = await findUserById(donation.userId);

        // Determine QF round for the donation
        let qfRound: QfRound | undefined;

        // First, check if the draft donation has a specific QF round assigned
        if (donation.qfRoundId) {
          qfRound =
            (await QfRound.findOneBy({
              id: donation.qfRoundId,
            })) || undefined;

          if (qfRound) {
            logger.debug(
              `Using QF round ${qfRound.id} from draft donation ${donation.id}`,
            );
          }
        }

        // If no specific QF round or round not found, use smart select logic
        if (!qfRound) {
          try {
            const smartSelectedQfRound = await selectQfRoundForProject(
              token.networkId,
              project.id,
            );

            // Find the actual QfRound entity to assign to the donation
            qfRound =
              (await QfRound.findOneBy({
                id: smartSelectedQfRound.qfRoundId,
              })) || undefined;
          } catch (error) {
            // If smart select fails (no eligible QF rounds), fall back to the old logic
            if (error instanceof QfRoundSmartSelectError) {
              logger.debug(
                `Smart select failed for QR donation, falling back to old logic: ${error.message}`,
                {
                  projectId: project.id,
                  networkId: token.networkId,
                  draftDonationId: donation.id,
                },
              );

              const activeQfRoundForProject =
                await relatedActiveQfRoundForProject(project.id);

              if (
                activeQfRoundForProject &&
                activeQfRoundForProject.isEligibleNetwork(token.networkId)
              ) {
                qfRound = activeQfRoundForProject;
              }
            }
          }
        }

        const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
          await calculateGivbackFactor(project.id);

        const returnedDonation = await createDonation({
          amount: donation.amount,
          project,
          transactionNetworkId: donation.networkId,
          fromWalletAddress: transaction.source_account,
          transactionId: transaction.transaction_hash,
          tokenAddress: donation.tokenAddress,
          isProjectGivbackEligible: project.isGivbackEligible,
          donorUser: donor,
          isTokenEligibleForGivback: token.isGivbackEligible,
          segmentNotified: false,
          toWalletAddress: donation.toWalletAddress,
          donationAnonymous: false,
          transakId: '',
          token: donation.currency,
          valueUsd: donation.amount * tokenPrice,
          priceUsd: tokenPrice,
          status: transaction.transaction_successful ? 'verified' : 'failed',
          isQRDonation: true,
          toWalletMemo,
          qfRound,
          chainType: token.chainType,
          givbackFactor,
          projectRank,
          bottomRankInRound,
          powerRound,
        });

        if (!returnedDonation) {
          logger.debug(
            `Error creating donation for draft donation ID ${donation.id}`,
          );
          return;
        }

        // Update draft donation status to matched and add matched donation ID with source address
        await updateDraftDonationStatus({
          donationId: donation.id,
          status: transaction.transaction_successful ? 'matched' : 'failed',
          fromWalletAddress: transaction.source_account,
          matchedDonationId: returnedDonation.id,
        });

        await syncDonationStatusWithBlockchainNetwork({
          donationId: returnedDonation.id,
        });

        // Notify clients of new donation
        notifyClients({
          type: 'new-donation',
          data: {
            donationId: returnedDonation.id,
            draftDonationId: donation.id,
          },
        });

        return;
      }
    }
  } catch (error) {
    logger.debug(
      `Error checking transactions for donation ID ${donation.id}:`,
      error,
    );
  }
}

// Cron job to check pending draft donations every 5 minutes
export const runCheckQRTransactionJob = () => {
  logger.debug('checkQRTransactionJob() has been called', { cronJobTime });

  schedule(cronJobTime, async () => {
    const pendingDonations = await getPendingDraftDonations();

    for (const donation of pendingDonations) {
      await checkTransactions(donation);
    }
  });
};
