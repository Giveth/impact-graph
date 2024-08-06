import abiDecoder from 'abi-decoder';
import { schedule } from 'node-cron';
import moment from 'moment';
import config from '../../config';
import { Donation } from '../../entities/donation';
import { logger } from '../../utils/logger';
import { NetworkTransactionInfo } from '../chains';
import { getProvider, NETWORKS_IDS_TO_NAME } from '../../provider';
import { erc20ABI } from '../../assets/erc20ABI';
import { User } from '../../entities/user';
import { Token } from '../../entities/token';
import { Project } from '../../entities/project';
import {
  getUserDonationStats,
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../userService';
import { toFixNumber } from '../donationService';
import { refreshProjectEstimatedMatchingView } from '../projectViewsService';
import { CoingeckoPriceAdapter } from '../../adapters/price/CoingeckoPriceAdapter';
import { QfRound } from '../../entities/qfRound';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { getNotificationAdapter } from '../../adapters/adaptersFactory';
import { getOrttoPersonAttributes } from '../../adapters/notifications/NotificationCenterAdapter';
import { updateProjectStatistics } from '../projectService';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ethers = require('ethers');
abiDecoder.addABI(erc20ABI);

const QF_ROUND_ID = config.get('LOST_DONATIONS_QF_ROUND');
const NETWORK_ID = config.get('LOST_DONATIONS_NETWORK_ID');
const NATIVE_NETWORK_TOKEN = config.get('LOST_DONATIONS_NATIVE_NETWORK_TOKEN');

const cronJobTime =
  (config.get('IMPORT_LOST_DONATIONS_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

// coma separated txHashes
const lostDonationsTxHashes = process.env.LOST_DONATIONS_TX_HASHES || '';

export const runSyncLostDonations = () => {
  logger.debug('runSyncLostDonations() has been called');
  schedule(cronJobTime, async () => {
    await importLostDonations();
  });
};

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

export const importLostDonations = async () => {
  const networkId = NETWORK_ID ? Number(NETWORK_ID) : 10; // optimism
  let donationParams;
  const qfRoundId = QF_ROUND_ID ? Number(QF_ROUND_ID) : undefined;
  try {
    const qfRound = await QfRound.createQueryBuilder('qfRound')
      .where(`qfRound.id = :id`, { id: qfRoundId })
      .getOne();

    const donationTxHashes = lostDonationsTxHashes.split(',');

    for (const tx of donationTxHashes) {
      try {
        logger.debug('processing txhash: ', tx);
        const donationExists = await Donation.createQueryBuilder('donation')
          .where(`lower(donation.transactionId) = :hash`, {
            hash: tx.toLowerCase(),
          })
          .getOne();

        if (donationExists) continue; // avoid duplicates

        const transaction = await getProvider(networkId).getTransaction(tx);
        if (!transaction) {
          // Transaction not found
          logger.debug('transaction not found for tx: ', tx);
          continue;
        }

        const receipt = await getProvider(networkId).getTransactionReceipt(tx);
        if (!receipt) {
          // Transaction is not mined yet
          // https://web3js.readthedocs.io/en/v1.2.0/web3-eth.html#gettransactionreceipt
          logger.debug('receipt not found for tx: ', tx);
          continue;
        }

        // decode transaction as ERC20 Token
        const transactionData = abiDecoder.decodeMethod(transaction.data);
        const erc20Token = receipt?.logs[0]?.address;

        // Search for the address in the correct location in the transaction
        const userAddress = transactionData
          ? '0x' + receipt?.logs[0]?.topics[1]?.substring(26)
          : transaction.from;

        const dbUser = await User.createQueryBuilder('user')
          .where(`lower(user.walletAddress) = :address`, {
            address: userAddress.toLowerCase(),
          })
          .getOne();

        if (!dbUser) {
          logger.debug('user not found for tx: ', tx);
          continue; // User does not exist on giveth, not a UI donation, skip
        }

        logger.debug('token address searched: ', erc20Token);

        // Check if its an ERC-20 Token
        let tokenInDB;
        if (transactionData) {
          tokenInDB = await Token.createQueryBuilder('token')
            .where(`lower(token.address) = :address`, {
              address: String(erc20Token)?.toLowerCase(),
            })
            .andWhere(`token.networkId = :networkId`, { networkId })
            .getOne();
        }

        if (transactionData && tokenInDB) {
          // It's a token transfer donation
          donationParams = await getDonationDetailForTokenTransfer(
            tx,
            networkId,
            transaction,
            receipt,
            tokenInDB,
            transactionData,
          );

          if (!donationParams) continue; // transaction not mined yet
        } else if (
          transaction?.value &&
          transaction?.value?.gt(0) &&
          (!transaction?.data || transaction?.data === '0x')
        ) {
          // it's an eth transfer native token
          const nativeToken = await Token.createQueryBuilder('token')
            .where(`token.id = :token`, { token: NATIVE_NETWORK_TOKEN })
            .getOne();

          tokenInDB = nativeToken;

          donationParams = await getDonationDetailForNormalTransfer(
            tx,
            networkId,
            transaction,
            receipt,
            nativeToken!,
          );
        } else {
          logger.debug('transaction type not valid for tx: ', tx);
          continue; // Not a transaction recognized by our logic
        }

        logger.debug('token being searched: ', tokenInDB?.id);

        if (!donationParams) {
          logger.debug('Params invalid for tx: ', tx);
          continue;
        }

        const project = await Project.createQueryBuilder('project')
          .leftJoinAndSelect('project.addresses', 'addresses')
          .leftJoinAndSelect('project.adminUser', 'adminUser')
          .where(`lower(addresses.address) = :address`, {
            address: donationParams?.to?.toLowerCase(),
          })
          .andWhere(`addresses.networkId = :networkId`, { networkId })
          .getOne();

        if (!project) {
          logger.debug('Project not found for tx: ', tx);
          continue; // project doesn't exist on giveth, skip donation
        }

        const donationDate = millisecondTimestampToDate(
          donationParams.timestamp * 1000,
        );
        const donationDateDbFormat = moment(donationDate).format(
          'YYYY-MM-DD HH:mm:ss',
        );
        const donationDateCoingeckoFormat =
          moment(donationDate).format('DD-MM-YYYY');

        const coingeckoAdapter = new CoingeckoPriceAdapter();
        let ethereumPriceAtDate;
        try {
          ethereumPriceAtDate = await coingeckoAdapter.getTokenPriceAtDate({
            symbol: tokenInDB!.coingeckoId,
            date: donationDateCoingeckoFormat,
          });
        } catch (e) {
          logger.debug('CoingeckoPrice not found for tx: ', tx);
          logger.error('importLostDonations() coingecko error', e);
        }

        if (!ethereumPriceAtDate) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND),
          );
        }

        let dbDonation: Donation;
        try {
          dbDonation = Donation.create({
            fromWalletAddress: donationParams.from.toLowerCase(),
            toWalletAddress: donationParams.to.toLowerCase(),
            transactionId: tx.toLowerCase(),
            projectId: project.id,
            userId: dbUser.id,
            currency: donationParams.currency,
            tokenAddress: tokenInDB?.address,
            amount: donationParams.amount,
            valueUsd: toFixNumber(
              ethereumPriceAtDate * donationParams.amount,
              4,
            ),
            transactionNetworkId: networkId,
            createdAt: donationDateDbFormat,
            status: 'verified',
            anonymous: false,
            segmentNotified: true,
            isTokenEligibleForGivback: tokenInDB?.isGivbackEligible,
            isProjectVerified: project?.verified,
            qfRoundId: qfRound?.id,
          });

          await dbDonation.save();
        } catch (e) {
          logger.debug('Error saving donation for for tx: ', tx);
          logger.debug('Error saving donation: ', e);
          continue;
        }

        await updateUserTotalDonated(dbUser.id);
        await updateUserTotalReceived(project.adminUser?.id);
        await updateProjectStatistics(project.id);

        const donationStats = await getUserDonationStats(dbUser.id);

        const orttoPerson = getOrttoPersonAttributes({
          userId: dbUser.id.toString(),
          firstName: dbUser?.firstName,
          lastName: dbUser?.lastName,
          email: dbUser?.email,
          totalDonated: donationStats?.totalDonated,
          donationsCount: donationStats?.donationsCount,
          lastDonationDate: donationStats?.lastDonationDate,
          QFDonor: dbDonation.qfRound?.name,
          donationChain: NETWORKS_IDS_TO_NAME[dbDonation.transactionNetworkId],
        });
        await getNotificationAdapter().updateOrttoPeople([orttoPerson]);
      } catch (e) {
        logger.error('importLostDonations() error', e);
        continue;
      }
    }

    // Figure out if its ideal to call this here or once, maybe in a button in adminjs
    await refreshProjectEstimatedMatchingView();
  } catch (e) {
    logger.error('importLostDonations() error', e);
  }
};

// native token transfer ETH for optimism
async function getDonationDetailForNormalTransfer(
  txHash: string,
  networkId: number,
  transaction: any,
  receipt: any,
  token: Token,
): Promise<NetworkTransactionInfo | null> {
  if (!receipt.status) {
    return null;
  }

  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );

  const transactionTo = transaction.to;
  const amount = ethers.utils.formatEther(transaction.value);

  return {
    from: transaction.from,
    timestamp: block.timestamp as number,
    to: transactionTo as string,
    hash: txHash,
    amount,
    currency: token.symbol,
  };
}

async function getDonationDetailForTokenTransfer(
  txHash: string,
  networkId: number,
  transaction: any,
  receipt: any,
  token: Token,
  transactionData?: any,
): Promise<NetworkTransactionInfo | null> {
  if (!receipt?.status || !transactionData) {
    return null;
  }

  const transactionFrom: string =
    '0x' + receipt?.logs[0]?.topics[1]?.substring(26);
  const transactionTo: string =
    '0x' + receipt?.logs[0]?.topics[2]?.substring(26);

  const amount = Number(
    ethers.utils.formatUnits(
      ethers.BigNumber.from(receipt?.logs[0]?.data),
      'ether',
    ),
  );

  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );
  return {
    from: transactionFrom,
    timestamp: block.timestamp as number,
    hash: txHash,
    to: transactionTo!,
    amount,
    currency: token.symbol,
  };
}
