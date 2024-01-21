import {
  getNotImportedDonationsFromBackup,
  markDonationAsImported,
} from '../../adapters/donationSaveBackup/donationSaveBackupAdapter';
import config from '../../config';

import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { detectAddressChainType } from '../../utils/networks';
import {
  createDonationQueryValidator,
  validateWithJoiSchema,
} from '../../utils/validators/graphqlQueryValidators';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { findProjectById } from '../../repositories/projectRepository';
import { ProjStatus, Project } from '../../entities/project';
import { Token } from '../../entities/token';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
} from '../donationService';
import { findProjectRecipientAddressByNetworkId } from '../../repositories/projectAddressRepository';
import {
  findUserByWalletAddress,
  setUserAsReferrer,
} from '../../repositories/userRepository';
import { ChainType } from '../../types/network';
import { Donation } from '../../entities/donation';
import { getChainvineReferralInfoForDonation } from '../chainvineReferralService';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import { NETWORK_IDS } from '../../provider';

const cronJobTime =
  (config.get('DONATION_SAVE_BACKUP_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

export const runSyncBackupServiceDonations = () => {
  logger.debug('importBackupServiceDonations() has been called');
  schedule(cronJobTime, async () => {
    await importBackupServiceDonations();
  });
};

// Minimum required params from the backup mongodb
interface BackupDonationData {
  _id: string;
  chainId: number;
  txHash: string;
  amount: number;
  token: {
    address: number;
  };
  projectId: number;
  anonymous: false;
  nonce?: string;
  walletAddress: string;
  symbol: string;
  chainvineReferred: string;
  safeTransactionId?: string;
}

// Mock Mongo Methods to write a test
export const importBackupServiceDonations = async () => {
  const limit = 10;
  let skip = 0;
  let donations = await getNotImportedDonationsFromBackup(limit, skip);
  while (donations.length > 0) {
    for (const donation of donations) {
      try {
        await createBackupDonation(donation);
        await markDonationAsImported(donation._id);
      } catch (e) {
        logger.error(`donation error with id ${donation._id}: `, e);
        logger.error('donation error with params: ', JSON.parse(donation));
      }
    }
    skip += limit;
    donations = await getNotImportedDonationsFromBackup(limit, skip);
  }
};

// Same logic as the donationResolver CreateDonation() mutation
const createBackupDonation = async donationData => {
  if (!donationData?.token?.address) return; // test donations

  const donorUser = await findUserByWalletAddress(donationData.walletAddress);
  if (!donorUser) {
    throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
  }

  const chainType = detectAddressChainType(donationData.walletAddress);

  const validDataInput = {
    amount: donationData.amount,
    transactionId: donationData.txHash,
    transactionNetworkId: donationData.chainId,
    anonymous: donationData.anonymous,
    tokenAddress: donationData.token.address,
    token: donationData.symbol,
    projectId: donationData.projectId,
    nonce: donationData.nonce,
    transakId: null, // TODO: remove this column it's unused
    referrerId: donationData.chainvineReferred,
    safeTransactionId: donationData.safeTransactionId,
    chainType,
  };

  validateJoiSchema(validDataInput);

  const project = await findProjectById(donationData.projectId);

  if (!project)
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
  if (project.status.id !== ProjStatus.active) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
      ),
    );
  }

  // Validate token
  const tokenInDb = await Token.findOne({
    where: {
      networkId: donationData.chainId,
      symbol: donationData.symbol,
    },
  });

  const [isCustomToken, isTokenEligibleForGivback] = await validateProjectToken(
    project,
    tokenInDb,
  );
  const projectRelatedAddress = await validateProjectRecipientAddress(
    project,
    donationData.chainId,
  );

  let toAddress = projectRelatedAddress.address;
  let fromAddress = donorUser.walletAddress!;
  let transactionTx = donationData.txHash;

  // Keep the lowerCase flow the same as before if it's EVM
  if (chainType === ChainType.EVM) {
    toAddress = toAddress.toLowerCase();
    fromAddress = fromAddress.toLowerCase();
    transactionTx = transactionTx.toLowerCase() as string;
  }

  const donation = await Donation.create({
    amount: donationData.amount,
    transactionId: transactionTx,
    isFiat: false,
    transactionNetworkId: donationData.chainId,
    currency: donationData.symbol,
    user: donorUser,
    tokenAddress: donationData.token.address,
    nonce: donationData.nonce,
    project,
    isTokenEligibleForGivback,
    isCustomToken,
    isProjectVerified: project.verified,
    createdAt: new Date(),
    segmentNotified: false,
    toWalletAddress: toAddress,
    fromWalletAddress: fromAddress,
    anonymous: Boolean(donationData.anonymous),
    safeTransactionId: donationData.safeTransactionId,
    chainType: chainType as ChainType,
  });

  // TODO: this is not correct naming, please add as chainvineReferrerId to mongo SCHEMA
  // I assume the id goes in that field, looks like a boolean
  if (donationData.chainvineReferred) {
    // Fill referrer data if referrerId is valid
    await setChainvineParamsOnDonation(
      donation,
      project,
      donationData.chainvineReferred,
    );
  }

  // Setup QfRound
  const activeQfRoundForProject = await relatedActiveQfRoundForProject(
    project.id,
  );
  if (
    activeQfRoundForProject &&
    activeQfRoundForProject.isEligibleNetwork(donation.transactionNetworkId)
  ) {
    donation.qfRound = activeQfRoundForProject;
  }
  await donation.save();

  // set chain network to fetch price
  await fillDonationCurrencyValues(donation, project, tokenInDb);
  logger.info(`Donation with Id ${donation.id} has been processed succesfully`);
};

const fillDonationCurrencyValues = async (
  donation: Donation,
  project: Project,
  token: Token | null,
) => {
  let priceChainId;
  switch (donation.transactionNetworkId) {
    case NETWORK_IDS.ROPSTEN:
      priceChainId = NETWORK_IDS.MAIN_NET;
      break;
    case NETWORK_IDS.GOERLI:
      priceChainId = NETWORK_IDS.MAIN_NET;
      break;
    case NETWORK_IDS.OPTIMISM_GOERLI:
      priceChainId = NETWORK_IDS.OPTIMISTIC;
      break;
    case NETWORK_IDS.MORDOR_ETC_TESTNET:
      priceChainId = NETWORK_IDS.ETC;
      break;
    default:
      priceChainId = donation.transactionNetworkId;
      break;
  }

  await updateDonationPricesAndValues(
    donation,
    project,
    token,
    donation.currency,
    priceChainId,
    donation.amount,
  );
};

const setChainvineParamsOnDonation = async (
  donation: Donation,
  project: Project,
  referredId: string,
) => {
  try {
    const {
      referralStartTimestamp,
      isReferrerGivbackEligible,
      referrerWalletAddress,
    } = await getChainvineReferralInfoForDonation({
      referrerId: referredId, // like this
      fromAddress: donation.fromWalletAddress,
      donorUserId: donation.userId,
      projectVerified: project.verified,
    });

    donation.isReferrerGivbackEligible = isReferrerGivbackEligible;
    donation.referrerWallet = referrerWalletAddress;
    donation.referralStartTimestamp = referralStartTimestamp;
    await setUserAsReferrer(referrerWalletAddress);

    await donation.save();
  } catch (e) {
    logger.error('get chainvine wallet address error', e);
  }
};

const validateProjectRecipientAddress = async (
  project: Project,
  networkId: number,
) => {
  const projectRelatedAddress = await findProjectRecipientAddressByNetworkId({
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

  return projectRelatedAddress;
};

const validateProjectToken = async (
  project: Project,
  tokenInDb?: Token | null,
) => {
  const isCustomToken = !Boolean(tokenInDb);
  let isTokenEligibleForGivback = false;
  if (isCustomToken && !project.organization.supportCustomTokens) {
    throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
  } else if (tokenInDb) {
    const acceptsToken = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: tokenInDb.id,
    });
    if (!acceptsToken && !project.organization.supportCustomTokens) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
        ),
      );
    }
    isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
  }

  return [isCustomToken, isTokenEligibleForGivback];
};

const validateJoiSchema = validDataInput => {
  try {
    validateWithJoiSchema(validDataInput, createDonationQueryValidator);
  } catch (e) {
    logger.error('Error on validating createDonation input', validDataInput);
    // Joi alternatives does not handle custom errors, have to catch them.
    if (e.message.includes('does not match any of the allowed types')) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_TRANSACTION_ID),
      );
    } else {
      throw e; // Rethrow the original error
    }
  }
};
