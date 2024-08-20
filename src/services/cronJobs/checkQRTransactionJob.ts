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
import { QfRound } from '../../entities/qfRound';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';

const STELLAR_HORIZON_API =
  (config.get('STELLAR_HORIZON_API_URL') as string) ||
  'https://horizon.stellar.org';
const cronJobTime =
  (config.get('CHECK_QR_TRANSACTIONS_CRONJOB_EXPRESSION') as string) ||
  '0 */1 * * * *';

async function getPendingDraftDonations() {
  return await DraftDonation.createQueryBuilder('draftDonation')
    .where('draftDonation.status = :status', { status: 'pending' })
    .andWhere('draftDonation.isQRDonation = true')
    .getMany();
}

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

    // Check if donation has expired
    const now = new Date().getTime();
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

    if (transactions.length === 0) return;

    for (const transaction of transactions) {
      const isMatchingTransaction =
        (transaction.asset_type === 'native' &&
          transaction.type === 'payment' &&
          transaction.to === toWalletAddress &&
          Number(transaction.amount) === amount) ||
        (transaction.type === 'create_account' &&
          transaction.account === toWalletAddress &&
          Number(transaction.starting_balance) === amount);

      if (isMatchingTransaction) {
        if (
          toWalletMemo &&
          transaction.type === 'payment' &&
          transaction.transaction.memo !== toWalletMemo
        ) {
          logger.debug(
            `Transaction memo does not match donation memo for donation ID ${donation.id}`,
          );
          return;
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

        // Check if there is an active QF round for the project and check if the token is eligible for the network
        const activeQfRoundForProject = await relatedActiveQfRoundForProject(
          project.id,
        );

        let qfRound: QfRound | undefined;
        if (
          activeQfRoundForProject &&
          activeQfRoundForProject.isEligibleNetwork(token.networkId)
        ) {
          qfRound = activeQfRoundForProject;
        }

        const returnedDonation = await createDonation({
          amount: donation.amount,
          project: project,
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
