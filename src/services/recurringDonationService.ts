import path from 'path';
import { promises as fs } from 'fs';
import { ethers } from 'ethers';
import {
  getNotificationAdapter,
  getSuperFluidAdapter,
} from '../adapters/adaptersFactory';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { Token } from '../entities/token';
import {
  getNetworkNameById,
  getProvider,
  NETWORK_IDS,
  superTokensToToken,
} from '../provider';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { findProjectById } from '../repositories/projectRepository';
import {
  findRecurringDonationById,
  updateRecurringDonationFromTheStreamDonations,
} from '../repositories/recurringDonationRepository';
import { findUserById } from '../repositories/userRepository';
import { ChainType } from '../types/network';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { logger } from '../utils/logger';
import { withRedisLease } from '../redis';
import { SuperFluidStreamPeriod } from '../adapters/superFluid/superFluidAdapterInterface';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
} from './donationService';
import { calculateGivbackFactor } from './givbackService';
import { updateUserTotalDonated, updateUserTotalReceived } from './userService';
import { User } from '../entities/user';
import { NOTIFICATIONS_EVENT_NAMES } from '../analytics/analytics';
import { selectQfRoundForProjectWithFallback } from './qfRoundSmartSelectService';
import { updateProjectStatistics } from './projectService';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';

// Initially it will only be monthly data
export const priceDisplay = 'month';

export const fetchStreamTableStartDate = (
  recurringDonation: RecurringDonation,
): number => {
  if (recurringDonation.donations && recurringDonation.donations.length > 0) {
    const latestDonation = recurringDonation?.donations?.reduce(
      (prev, current) => {
        return prev.createdAt > current.createdAt ? prev : current;
      },
    );

    return Math.floor(latestDonation?.createdAt?.getTime() / 1000);
  }

  return Math.floor(recurringDonation.createdAt.getTime() / 1000);
};

const fetchStreamPeriodsForRecurringDonation = (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  return superFluidAdapter.streamPeriods({
    address: recurringDonation.anchorContractAddress.address,
    chain: recurringDonation.networkId,
    start: fetchStreamTableStartDate(recurringDonation),
    end: Math.floor(new Date().getTime() / 1000),
    priceGranularity: priceDisplay,
    virtualization: priceDisplay,
    currency: 'USD',
    recurringDonationTxHash: recurringDonation.txHash,
  });
};

export const createRelatedDonationsToStream = async (
  recurringDonation: RecurringDonation,
  // Lets a caller that already fetched (and verified) the stream data reuse
  // it instead of querying the accounting API a second time.
  prefetchedStreamData?: SuperFluidStreamPeriod,
) => {
  const streamData =
    prefetchedStreamData ??
    (await fetchStreamPeriodsForRecurringDonation(recurringDonation));

  if (!streamData) {
    // The accounting API errored (the adapter logs and returns undefined) or
    // has no stream for this txHash yet: leave the donation as it is and let
    // the next daily run try again.
    logger.info(
      'createRelatedDonationsToStream() no stream data, skipping this run',
      { recurringDonationId: recurringDonation.id },
    );
    return;
  }

  if (recurringDonation.status === RECURRING_DONATION_STATUS.PENDING) {
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();
  }

  if (streamData.stoppedAtTimestamp) {
    recurringDonation.finished = true;
    recurringDonation.status = RECURRING_DONATION_STATUS.ENDED;
    await recurringDonation.save();
    await getNotificationAdapter().userSuperTokensCritical({
      user: recurringDonation.donor,
      eventName: NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_DEPLETED,
      tokenSymbol: recurringDonation.currency,
      isEnded: recurringDonation.finished,
      project: recurringDonation.project,
      networkName: getNetworkNameById(recurringDonation.networkId),
    });
  }

  const project = await findProjectById(recurringDonation.projectId);
  const donorUser = await findUserById(recurringDonation.donorId);

  if (!project) return;
  if (!donorUser) return;

  const uniquePeriods: any[] = [];

  for (const period of streamData.virtualPeriods) {
    const existingPeriod = await Donation.findOne({
      where: {
        recurringDonationId: recurringDonation.id,
        virtualPeriodStart: period.startTime,
        virtualPeriodEnd: period.endTime,
      },
    });

    if (!existingPeriod) {
      uniquePeriods.push({
        startTime: period.startTime,
        endTime: period.endTime,
        amount: period.amount,
        amountFiat: period.amountFiat,
      });
    }
  }
  let networkId: number = recurringDonation.networkId;

  if (networkId === NETWORK_IDS.BASE_SEPOLIA) {
    networkId = NETWORK_IDS.BASE_MAINNET;
  }

  // create donation if any virtual period is missing
  if (uniquePeriods.length === 0) return;

  for (const streamPeriod of uniquePeriods) {
    try {
      const symbolCurrency = recurringDonation.currency.includes('x')
        ? superTokensToToken[recurringDonation.currency]
        : recurringDonation.currency;
      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: symbolCurrency,
        },
      });
      const isCustomToken = !tokenInDb;
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project!.organization.supportCustomTokens) {
        throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId: project!.id,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project!.organization.supportCustomTokens) {
          throw new Error(
            i18n.__(
              translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
            ),
          );
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }
      const projectRelatedAddress =
        await findProjectRecipientAddressByNetworkId({
          projectId: project.id,
          networkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
          ),
        );
      }

      const toAddress = projectRelatedAddress?.address?.toLowerCase();
      const fromAddress = donorUser.walletAddress?.toLowerCase();
      const transactionTx = `${streamData.id?.toLowerCase()}-${streamPeriod.endTime}`;
      const donation = Donation.create({
        amount: normalizeNegativeAmount(
          streamPeriod.amount,
          // All Super fluid tokens have 18 decimals even USDSx https://optimistic.etherscan.io/token/0x8430f084b939208e2eded1584889c9a66b90562f
          18,
        ),

        // prevent setting NaN value for valueUsd
        valueUsd: Math.abs(Number(streamPeriod.amountFiat)) || 0,
        transactionId: transactionTx,
        isFiat: false,
        transactionNetworkId: networkId,
        currency: tokenInDb?.symbol,
        user: donorUser,
        tokenAddress: tokenInDb?.address,
        project,
        status: DONATION_STATUS.VERIFIED,
        isTokenEligibleForGivback,
        isCustomToken,
        isProjectGivbackEligible: project.isGivbackEligible,
        createdAt: new Date(),
        segmentNotified: false,
        toWalletAddress: toAddress,
        fromWalletAddress: fromAddress,
        recurringDonation,
        anonymous: Boolean(recurringDonation.anonymous),
        chainType: ChainType.EVM,
        virtualPeriodStart: streamPeriod.startTime,
        virtualPeriodEnd: streamPeriod.endTime,
      });

      await donation.save();
      logger.debug(`Streamed donation has been created successfully`, {
        donationId: donation.id,
        recurringDonationId: recurringDonation.id,
        amount: donation.amount,
      });

      // Use smart select logic to find the best QF round for this project and network
      const qfRound = await selectQfRoundForProjectWithFallback(
        networkId,
        project.id,
        { recurringDonationId: recurringDonation.id },
      );
      if (qfRound) {
        const projectOwner = await User.findOneBy({
          id: project.adminUserId,
        });
        donation.qfRound = qfRound;
        donation.qfRoundUserScore = projectOwner?.passportScore;
      }

      const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
        await calculateGivbackFactor(project.id);
      donation.givbackFactor = givbackFactor;
      donation.projectRank = projectRank;
      donation.bottomRankInRound = bottomRankInRound;
      donation.powerRound = powerRound;

      await donation.save();

      if (!donation.valueUsd || donation.valueUsd === 0) {
        await updateDonationPricesAndValues(
          donation,
          project,
          tokenInDb!,
          donation.transactionNetworkId,
        );
      }

      logger.debug(`Streamed donation After filling valueUsd`, {
        donationId: donation.id,
        recurringDonationId: recurringDonation.id,
        amount: donation.amount,
        valueUsd: donation.valueUsd,
      });
      await updateRecurringDonationFromTheStreamDonations(recurringDonation.id);

      await updateUserTotalDonated(donation.userId);

      // After updating price we update totalDonations
      await updateProjectStatistics(donation.projectId, donation?.qfRoundId);
      await updateUserTotalReceived(project!.adminUser.id);
    } catch (e) {
      logger.error(
        'createRelatedDonationsToStream() error',
        {
          recurringDonationId: recurringDonation.id,
        },
        e,
      );
    }
  }
};

export function normalizeNegativeAmount(
  amount: string,
  decimals: number,
): number {
  return Math.abs(Number(amount)) / 10 ** decimals;
}

export const getRecurringDonationTxInfo = async (params: {
  txHash: string;
  networkId: number;
  isBatch: boolean;
}): Promise<
  {
    receiver: string;
    flowRate: string;
    tokenAddress: string;
  }[]
> => {
  const { txHash, networkId, isBatch } = params;
  const output: {
    receiver: string;
    flowRate: string;
    tokenAddress: string;
  }[] = [];

  logger.debug('getRecurringDonationTxInfo() has been called', params);

  try {
    const web3Provider = getProvider(networkId);
    const networkData = await web3Provider.getTransaction(txHash);
    if (!networkData) {
      logger.error(
        'Transaction not found in the network. maybe its not mined yet',
        {
          networkId,
          txHash,
        },
      );
      throw new Error(
        i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
      );
    }

    let receiverLowercase = '';
    let flowRateBigNumber = '';
    let tokenAddress = '';

    if (!isBatch) {
      const abiPath = path.join(__dirname, '../abi/superFluidAbi.json');
      const abi = JSON.parse(await fs.readFile(abiPath, 'utf-8'));
      const iface = new ethers.utils.Interface(abi);
      const decodedData = iface.parseTransaction({ data: networkData.data });
      tokenAddress = decodedData.args[0].toLowerCase();
      receiverLowercase = decodedData.args[2].toLowerCase();
      flowRateBigNumber = decodedData.args[3];
      output.push({
        tokenAddress,
        receiver: receiverLowercase,
        flowRate: ethers.BigNumber.from(flowRateBigNumber).toString(),
      });
    } else {
      // ABI comes from https://sepolia-optimism.etherscan.io/address/0x78743a68d52c9d6ccf3ff4558f3af510592e3c2d#code
      const abiPath = path.join(__dirname, '../abi/superFluidAbiBatch.json');
      const abi = JSON.parse(await fs.readFile(abiPath, 'utf-8'));
      const iface = new ethers.utils.Interface(abi);
      const decodedData = iface.parseTransaction({ data: networkData.data });

      for (const bachItem of decodedData.args[0]) {
        // console.log('opData', decodedData.args)
        const operationData = bachItem[2];
        const decodedOperationData = ethers.utils.defaultAbiCoder.decode(
          ['bytes', 'bytes'],
          operationData,
        );
        const abiPath2 = path.join(
          __dirname,
          '../abi/superFluidAbi_batch_decoded.json',
        );
        const decodedDataAbi = JSON.parse(await fs.readFile(abiPath2, 'utf-8'));
        const decodedDataIface = new ethers.utils.Interface(decodedDataAbi);
        const finalDecodedData = decodedDataIface.parseTransaction({
          data: decodedOperationData[0],
        });
        receiverLowercase = finalDecodedData.args[1].toLowerCase();
        flowRateBigNumber = finalDecodedData.args[2];
        tokenAddress = decodedData.args[0].toLowerCase();
        output.push({
          tokenAddress,
          receiver: receiverLowercase,
          flowRate: ethers.BigNumber.from(flowRateBigNumber).toString(),
        });
      }
    }

    return output;
  } catch (e) {
    logger.error('getRecurringDonationTxInfo() error', {
      error: e,
      params,
    });
    throw e;
  }
};

const toLowerCaseAddress = (value?: string | null) =>
  typeof value === 'string' ? value.toLowerCase() : undefined;

// Guards against the accounting API returning a period for a different
// stream than the one stored for this recurring donation: the sender must be
// the donor, the receiver the project's anchor contract, and the chain and
// token must match. Throws RECURRING_DONATION_STREAM_MISMATCH otherwise.
export const assertStreamMatchesRecurringDonation = (
  streamData: SuperFluidStreamPeriod,
  recurringDonation: RecurringDonation,
) => {
  const expectedSender = toLowerCaseAddress(
    recurringDonation.donor?.walletAddress,
  );
  const expectedReceiver = toLowerCaseAddress(
    recurringDonation.anchorContractAddress?.address,
  );
  const sender = toLowerCaseAddress(streamData?.sender);
  const receiver = toLowerCaseAddress(streamData?.receiver);
  const mismatches: string[] = [];
  if (!expectedSender || !sender || sender !== expectedSender) {
    mismatches.push('sender');
  }
  if (!expectedReceiver || !receiver || receiver !== expectedReceiver) {
    mismatches.push('receiver');
  }
  if (
    streamData?.chainId !== undefined &&
    streamData?.chainId !== null &&
    Number(streamData.chainId) !== Number(recurringDonation.networkId)
  ) {
    mismatches.push('chainId');
  }
  const tokenSymbol: string | undefined = streamData?.token?.symbol;
  const expectedCurrency = recurringDonation.currency?.toLowerCase();
  if (tokenSymbol && expectedCurrency) {
    const acceptedSymbols = [
      tokenSymbol,
      superTokensToToken[tokenSymbol],
      tokenSymbol.replace(/x$/i, ''),
    ]
      .filter(Boolean)
      .map(symbol => symbol.toLowerCase());
    if (!acceptedSymbols.includes(expectedCurrency)) {
      mismatches.push('token');
    }
  }
  if (mismatches.length > 0) {
    logger.error('assertStreamMatchesRecurringDonation() mismatch', {
      recurringDonationId: recurringDonation.id,
      mismatches,
      sender,
      receiver,
      chainId: streamData?.chainId,
      tokenSymbol,
    });
    throw new Error(
      i18n.__(translationErrorMessagesKeys.RECURRING_DONATION_STREAM_MISMATCH),
    );
  }
};

// createRelatedDonationsToStream inserts one Donation per stream period with
// a find-then-insert and no unique index behind it, so two runs for the same
// recurring donation at the same time (daily job + on-demand reconciliation,
// or two reconciliation requests) could insert the same period twice. Both
// callers go through this per-donation Redis lease.
//
// Remaining duplicate-insert risk (documented, not closed here): the lease is
// best effort. It is skipped when Redis is unreachable, and a sync that runs
// longer than STREAM_SYNC_LOCK_TTL_MS lets a second run start while the first
// is still inserting. Only a unique index on
// donation(recurringDonationId, virtualPeriodStart, virtualPeriodEnd) would
// rule duplicates out; adding it is deferred until existing rows have been
// checked for duplicates (see the query in the PR notes).
const STREAM_SYNC_LOCK_TTL_MS = 5 * 60_000;
export const getStreamSyncLockKey = (recurringDonationId: number) =>
  `recurring-donation-stream-sync-lock-${recurringDonationId}`;

export const withRecurringDonationSyncLock = <T>(
  recurringDonationId: number,
  fn: () => Promise<T>,
) =>
  withRedisLease(
    getStreamSyncLockKey(recurringDonationId),
    STREAM_SYNC_LOCK_TTL_MS,
    fn,
  );

export const isRecurringDonationFinal = (
  recurringDonation: RecurringDonation,
) =>
  recurringDonation.finished ||
  recurringDonation.status === RECURRING_DONATION_STATUS.ENDED ||
  recurringDonation.status === RECURRING_DONATION_STATUS.FAILED;

// On-demand counterpart of the daily stream sync, used when the frontend
// finds that a stream no longer exists on-chain (ended elsewhere or liquidated
// by Superfluid) while the backend still reports it as active.
//
// The status is never taken from the client: the stream is re-read from the
// Superfluid accounting API (the same trusted source the daily job uses),
// checked against the stored sender/receiver/chain/token, and only when it has
// a stop timestamp is the existing sync routine run, which records the final
// stream periods and marks the donation ENDED exactly as the daily job would.
// Already-finished donations return unchanged, and the shared per-donation
// lock keeps concurrent requests (or the daily job) from running the sync
// twice.
export const reconcileRecurringDonationStatusWithNetwork = async (params: {
  recurringDonation: RecurringDonation;
}): Promise<RecurringDonation> => {
  const { recurringDonation } = params;
  logger.debug(
    'reconcileRecurringDonationStatusWithNetwork() has been called',
    {
      recurringDonationId: recurringDonation.id,
      status: recurringDonation.status,
      finished: recurringDonation.finished,
    },
  );

  if (isRecurringDonationFinal(recurringDonation)) {
    // Nothing left to reconcile; repeated calls are no-ops.
    return recurringDonation;
  }

  const outcome = await withRecurringDonationSyncLock(
    recurringDonation.id,
    async () => {
      // Re-read inside the lock: the daily job or another request may have
      // just finished this donation.
      const current =
        (await findRecurringDonationById(recurringDonation.id)) ||
        recurringDonation;
      if (isRecurringDonationFinal(current)) {
        return current;
      }

      const streamData = await fetchStreamPeriodsForRecurringDonation(current);
      if (!streamData) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.RECURRING_DONATION_STREAM_NOT_VERIFIABLE,
          ),
        );
      }
      assertStreamMatchesRecurringDonation(streamData, current);

      if (!streamData.stoppedAtTimestamp) {
        // Still flowing on-chain: the stored status stays as it is.
        return current;
      }

      await createRelatedDonationsToStream(current, streamData);
      return (await findRecurringDonationById(current.id)) || current;
    },
  );

  if (!outcome.acquired) {
    logger.info(
      'reconcileRecurringDonationStatusWithNetwork() skipped, another sync of this donation is in progress',
      { recurringDonationId: recurringDonation.id },
    );
    // Report whatever the other sync has persisted so far rather than the
    // snapshot loaded before the lock (which may already be stale).
    return (
      (await findRecurringDonationById(recurringDonation.id)) ||
      recurringDonation
    );
  }
  return outcome.result;
};

export const updateRecurringDonationStatusWithNetwork = async (params: {
  donationId: number;
}): Promise<RecurringDonation> => {
  logger.debug(
    'updateRecurringDonationStatusWithNetwork() has been called',
    params,
  );
  const recurringDonation = await findRecurringDonationById(params.donationId);
  if (!recurringDonation) {
    throw new Error('Recurring donation not found');
  }

  try {
    const superFluidAdapter = getSuperFluidAdapter();
    const txData = await superFluidAdapter.getFlowByTxHash({
      receiver:
        recurringDonation?.anchorContractAddress?.address?.toLowerCase() as string,
      flowRate: recurringDonation.flowRate,
      sender: recurringDonation?.donor?.walletAddress?.toLowerCase() as string,
      transactionHash: recurringDonation.txHash,
      networkId: recurringDonation.networkId,
    });
    if (!txData) {
      throw new Error(
        `SuperFluid tx not found in the subgraph txHash:${recurringDonation.txHash}`,
      );
    }
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();
    const project = recurringDonation.project;
    const projectOwner = await User.findOneBy({ id: project.adminUserId });
    await getNotificationAdapter().donationReceived({
      project,
      user: projectOwner,
      donation: recurringDonation,
    });
    return recurringDonation;
  } catch (e) {
    logger.error('updateRecurringDonationStatusWithNetwork() error', {
      error: e,
      params,
    });
    return recurringDonation;
  }
};

export const recurringDonationsCountPerDateRange = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
): Promise<number> => {
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('COALESCE(COUNT(DISTINCT recurringDonation.id), 0)', 'count')
    .innerJoin('recurringDonation.donations', 'donations')
    .where('recurringDonation.status != :status', {
      status: RECURRING_DONATION_STATUS.FAILED,
    });

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('recurringDonation.networkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  const recurringDonationsCount = await query
    .cache(
      `recurringDonationsCountPerDateRange-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
      300000,
    )
    .getRawOne();

  return recurringDonationsCount.count;
};

export const recurringDonationsCountPerDateRangePerMonth = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('COUNT(DISTINCT recurringDonation.id)', 'total')
    .addSelect("TO_CHAR(recurringDonation.createdAt, 'YYYY/MM')", 'date')
    .innerJoin('recurringDonation.donations', 'donations')
    .where('recurringDonation.status != :status', {
      status: RECURRING_DONATION_STATUS.FAILED,
    });

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('recurringDonation.networkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  query.groupBy('date');
  query.orderBy('date', 'ASC');

  query.cache(
    `recurringDonationsCountPerDateRangePerMonthAndYear-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
    300000,
  );

  return query.getRawMany();
};

export const recurringDonationsStreamedCUsdTotal = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
): Promise<number> => {
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('COALESCE(SUM(donations.valueUsd), 0)', 'total')
    .innerJoin('recurringDonation.donations', 'donations');

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('donations.transactionNetworkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  const recurringDonationsTotal = await query
    .cache(
      `recurringDonationsStreamedCUsdTotal-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
      300000,
    )
    .getRawOne();

  return recurringDonationsTotal.total;
};

export const recurringDonationsStreamedCUsdTotalPerMonth = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('SUM(donations.valueUsd)', 'total')
    .addSelect("TO_CHAR(donations.createdAt, 'YYYY/MM')", 'date')
    .innerJoin('recurringDonation.donations', 'donations');

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('donations.transactionNetworkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  query.groupBy('date');
  query.orderBy('date', 'ASC');

  const recurringDonationsTotal = await query
    .cache(
      `recurringDonationsStreamedCUsdTotalPerMonth-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
      300000,
    )
    .getRawMany();

  return recurringDonationsTotal;
};

export const recurringDonationsTotalPerToken = async (params: {
  fromDate?: string;
  toDate?: string;
  networkId?: number;
  onlyVerified?: boolean;
}): Promise<{ token: string; total: number }[]> => {
  const { fromDate, toDate, networkId, onlyVerified } = params;
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('donations.currency', 'token')
    .addSelect('COALESCE(SUM(donations.valueUsd), 0)', 'total')
    .innerJoin('recurringDonation.donations', 'donations')
    .groupBy('donations.currency')
    .having('SUM(donations.valueUsd) > 0');

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('donations.transactionNetworkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  const recurringDonationsTotal = await query
    .cache(
      `recurringDonationsTotalPerToken-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
      300000,
    )
    .getRawMany();

  return recurringDonationsTotal;
};

export const recurringDonationsCountPerToken = async (params: {
  fromDate?: string;
  toDate?: string;
  networkId?: number;
  onlyVerified?: boolean;
}): Promise<{ token: string; total: number }[]> => {
  const { fromDate, toDate, networkId, onlyVerified } = params;
  const query = RecurringDonation.createQueryBuilder('recurringDonation')
    .select('donations.currency', 'token')
    .addSelect('COALESCE(COUNT(DISTINCT recurringDonation.id), 0)', 'total')
    .innerJoin('recurringDonation.donations', 'donations')
    .where('recurringDonation.status != :status', {
      status: RECURRING_DONATION_STATUS.FAILED,
    })
    .groupBy('donations.currency')
    .having('COUNT(recurringDonation.id) > 0');

  if (fromDate) {
    query.andWhere('donations.createdAt >= :fromDate', {
      fromDate: new Date(fromDate),
    });
  }

  if (toDate) {
    query.andWhere('donations.createdAt <= :toDate', {
      toDate: new Date(toDate),
    });
  }

  if (networkId) {
    query.andWhere('recurringDonation.networkId = :networkId', {
      networkId,
    });
  }

  if (onlyVerified) {
    query
      .leftJoin('recurringDonation.project', 'project')
      .andWhere('project.verified = :verified', {
        verified: true,
      });
  }

  const recurringDonationsTotal = await query
    .cache(
      `recurringDonationsCountPerToken-${fromDate || ''}-${toDate || ''}-${networkId || 'all'}-${onlyVerified || 'all'}`,
      300000,
    )
    .getRawMany();

  return recurringDonationsTotal;
};
