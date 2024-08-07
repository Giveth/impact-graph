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

const STELLAR_HORIZON_API = (config.get('STELLAR_HORIZON_API_URL') as string) || 'https://horizon.stellar.org';
const cronJobTime = (config.get('CHECK_QR_TRANSACTIONS_CRONJOB_EXPRESSION') as string) || '0 */3 * * * *';

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
async function checkTransactions(donation: DraftDonation): Promise<void> {
  const { toWalletAddress, amount, toWalletMemo } = donation;

  try {
    const response = await axios.get(
      `${STELLAR_HORIZON_API}/accounts/${toWalletAddress}/payments?limit=200&order=desc&join=transactions&include_failed=true`,
    );

    const transactions = response.data._embedded.records;

    if (transactions.length === 0) return;

    for (const transaction of transactions) {
      if (
        transaction.asset_type === 'native' &&
        transaction.type === 'payment' &&
        Number(transaction.amount) === amount &&
        transaction.to === toWalletAddress
      ) {
        if (toWalletMemo && transaction.transaction.memo !== toWalletMemo) {
          logger.debug(
            `Transaction memo does not match donation memo for donation ID ${donation.id}`,
          );
          return;
        }

        const existingDonation = await findDonationsByTransactionId(
          transaction.transaction_hash?.toLowerCase(),
        );
        if (existingDonation) return;

        const token = await getToken('STELLAR', 'XLM');
        if (!token) {
          logger.debug('Token not found for donation ID', donation.id);
          return;
        }

        const project = await findProjectById(donation.projectId);
        if (!project) {
          logger.debug(`Project not found for donation ID ${donation.id}`);
          return;
        }

        const tokenPrice = await new CoingeckoPriceAdapter().getTokenPrice({
          symbol: token.coingeckoId,
          networkId: token.networkId,
        });

        const returnedDonation = await createDonation({
          amount: donation.amount,
          project: project,
          transactionNetworkId: donation.networkId,
          fromWalletAddress: transaction.source_account,
          transactionId: transaction.transaction_hash,
          tokenAddress: donation.tokenAddress,
          isProjectVerified: project.verified,
          donorUser: donation.userId,
          isTokenEligibleForGivback: token.isGivbackEligible,
          segmentNotified: false,
          toWalletAddress: donation.toWalletAddress,
          donationAnonymous: donation.userId ? false : true,
          transakId: '',
          token: donation.currency,
          valueUsd: donation.amount * tokenPrice,
          priceUsd: tokenPrice,
          status: transaction.transaction_successful ? 'verified' : 'failed',
          isQRDonation: true,
          toWalletMemo,
        });

        if (!returnedDonation) {
          logger.debug(
            `Error creating donation for donation ID ${donation.id}`,
          );
          return;
        }

        await updateDraftDonationStatus({
          donationId: donation.id,
          status: transaction.transaction_successful ? 'matched' : 'failed',
          fromWalletAddress: transaction.source_account,
          matchedDonationId: returnedDonation.id,
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
