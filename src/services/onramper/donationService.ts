import { Donation, DONATION_STATUS } from '../../entities/donation';
import { ProjStatus } from '../../entities/project';
import { Token } from '../../entities/token';
import { NETWORK_IDS } from '../../provider';
import { findProjectRecipientAddressByNetworkId } from '../../repositories/projectAddressRepository';
import { findProjectById } from '../../repositories/projectRepository';
import { findUserById } from '../../repositories/userRepository';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
  updateTotalDonationsOfProject,
} from '../donationService';
import { OnRamperFiatTransaction, OnRamperMetadata } from './fiatTransaction';
import SentryLogger from '../../sentryLogger';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../userService';

export const createFiatDonationFromOnramper = async (
  fiatTransaction: OnRamperFiatTransaction,
): Promise<void> => {
  try {
    // TODO add givbackFactor, powerRound, ... later
    let donation = await Donation.findOne({
      transactionId: fiatTransaction.payload.txHash!.toLowerCase(),
    });

    if (donation) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.FIAT_DONATION_ALREADY_EXISTS),
      );
    }

    // Custom Metadata from the frontend at the time of donation
    let metadata: OnRamperMetadata;
    if (typeof fiatTransaction.payload.partnerContext === 'string') {
      metadata = JSON.parse(fiatTransaction.payload.partnerContext);
    } else {
      metadata = fiatTransaction.payload.partnerContext;
    }

    const donorUser = await findUserById(Number(metadata.userId));
    if (!donorUser) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }
    const project = await findProjectById(Number(metadata.projectId));

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.status.id !== ProjStatus.active) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
        ),
      );
    }
    // mainnet ETH is the out currency
    const priceChainId = NETWORK_IDS.MAIN_NET;
    const isCustomToken = false;

    // Ethereum mainnet always exists
    const tokenInDb = await Token.findOne({
      networkId: priceChainId,
      symbol: fiatTransaction.payload.outCurrency,
    });
    const isTokenEligibleForGivback = tokenInDb!.isGivbackEligible;

    const acceptsToken = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: tokenInDb!.id,
    });

    if (!acceptsToken) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
        ),
      );
    }

    const projectRelatedAddress = await findProjectRecipientAddressByNetworkId({
      projectId: project.id,
      networkId: priceChainId,
    });

    if (!projectRelatedAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
        ),
      );
    }

    const toAddress = projectRelatedAddress?.address.toLowerCase() as string;
    const ethMainnetAddress = '0x0000000000000000000000000000000000000000';

    // FromWalletAddress is not the donor wallet, but the Onramper Address
    donation = await Donation.create({
      amount: Number(fiatTransaction.payload.outAmount),
      transactionId: fiatTransaction.payload.txHash!.toLowerCase(),
      isFiat: true,
      transactionNetworkId: Number(priceChainId),
      currency: fiatTransaction.payload.outCurrency,
      user: donorUser,
      tokenAddress: ethMainnetAddress,
      project,
      isTokenEligibleForGivback,
      isCustomToken,
      isProjectVerified: project.verified,
      createdAt: new Date(fiatTransaction.payload.timestamp),
      segmentNotified: false,
      toWalletAddress: toAddress.toString().toLowerCase(),
      fromWalletAddress: fiatTransaction.payload.wallet!.toLowerCase(),
      anonymous: metadata.anonymous === 'true',
      onramperId: fiatTransaction.payload.txId,
      onramperTransactionStatus: fiatTransaction.type,
      status: DONATION_STATUS.VERIFIED,
    });

    await donation.save();
    const baseTokens = priceChainId === 1 ? ['USDT', 'ETH'] : ['WXDAI', 'WETH'];

    await updateDonationPricesAndValues(
      donation,
      project,
      fiatTransaction.payload.outCurrency,
      baseTokens,
      priceChainId,
      fiatTransaction.payload.outAmount,
    );

    // After updating, recalculate user total donated and owner total received
    await updateUserTotalDonated(donorUser.id);

    // After updating price we update totalDonations
    await updateTotalDonationsOfProject(project.id);
    await updateUserTotalReceived(Number(project.admin));
  } catch (e) {
    SentryLogger.captureException(e);
    logger.error('createFiatDonationFromOnramper() error', e);
    throw e;
  }
};
