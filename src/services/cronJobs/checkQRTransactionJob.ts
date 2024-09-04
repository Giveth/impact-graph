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

const registerSecondaryDonation = async (
  donation: DraftDonation,
  fromWalletAddress: string,
  prevTransactionId: string,
  prevTransactionCreatedAt: string,
  project: any,
  token: any,
  tokenPrice: any,
  donor: any,
  qfRound: any,
) => {
  try {
    // deteect similar transaction on stellar network with time difference of less/more than 1 minute
    const response = await axios.get(
      `${STELLAR_HORIZON_API}/accounts/${donation.toWalletAddress}/payments?limit=200&order=desc&join=transactions&include_failed=true`,
    );

    const transactions = response.data._embedded.records;
    if (!transactions.length) return;

    for (const transaction of transactions) {
      const isSecondaryMatchingTransaction =
        ((transaction.asset_type === 'native' &&
          transaction.type === 'payment' &&
          transaction.to === donation.toWalletAddress &&
          Number(transaction.amount) === donation.amount &&
          transaction.source_account === fromWalletAddress) ||
          (transaction.type === 'create_account' &&
            transaction.account === donation.toWalletAddress &&
            Number(transaction.starting_balance) === donation.amount &&
            transaction.source_account === fromWalletAddress)) &&
        Math.abs(
          new Date(transaction.created_at).getTime() -
            new Date(prevTransactionCreatedAt).getTime(),
        ) <= 60000 &&
        transaction.transaction_hash !== prevTransactionId;

      if (isSecondaryMatchingTransaction) {
        if (
          donation.toWalletMemo &&
          transaction.type === 'payment' &&
          transaction.transaction.memo !== donation.toWalletMemo
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

        const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
          await calculateGivbackFactor(project.id);

        const returnedDonation = await createDonation({
          amount: donation.amount,
          project,
          transactionNetworkId: donation.networkId,
          fromWalletAddress: transaction.source_account,
          transactionId: transaction.transaction_hash,
          tokenAddress: donation.tokenAddress,
          isProjectVerified: project.verified,
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
          toWalletMemo: donation.toWalletMemo,
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

        await syncDonationStatusWithBlockchainNetwork({
          donationId: returnedDonation.id,
        });
      }
    }
  } catch (error) {
    logger.debug(
      `Error checking secondary transactions for donation ID ${donation.id}:`,
      error,
    );
  }
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

        // Register secondary donation after 10 seconds
        setTimeout(async () => {
          await registerSecondaryDonation(
            donation,
            transaction.source_account,
            transaction.transaction_hash,
            transaction.created_at,
            project,
            token,
            tokenPrice,
            donor,
            qfRound,
          );
        }, 10000);

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
