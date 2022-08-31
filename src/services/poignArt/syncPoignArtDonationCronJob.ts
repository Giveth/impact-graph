import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../../entities/donation';
import { Project } from '../../entities/project';
import { convertTimeStampToSeconds } from '../../utils/utils';
import { getPoignArtWithdrawals, PoignArtWithdrawal } from './api';
import { fetchGivHistoricPrice } from '../givPriceService';
import { NETWORK_IDS } from '../../provider';
import { updateUserTotalReceived } from '../userService';
import { updateTotalDonationsOfProject } from '../donationService';

/**
 * @see{@link https://github.com/Giveth/impact-graph/issues/433}
 */

const cronJobTime =
  (config.get('SYNC_POIGN_ART_CRONJOB_EXPRESSION') as string) || '0 0 * * 0';

const poignArtOriginAddress = config.get('POIGN_ART_ORIGIN_ADDRESS') as string;

export const runSyncPoignArtDonations = () => {
  logger.debug('runSyncPoignArtDonations() has been called');
  schedule(cronJobTime, async () => {
    await importPoignArtDonations();
  });
};

const importPoignArtDonations = async () => {
  try {
    let startTimestamp = 0;
    const lastPoignArtDonation = await Donation.createQueryBuilder('donation')
      .where(`donation.donationType = '${DONATION_TYPES.POIGN_ART}'`)
      .orderBy('donation.createdAt', 'DESC')
      .getOne();
    if (lastPoignArtDonation) {
      startTimestamp = convertTimeStampToSeconds(
        lastPoignArtDonation.createdAt.getTime(),
      );
    }
    const unchainProjectAddress = process.env
      .POIGN_ART_RECIPIENT_ADDRESS as string;
    const unchainProject = await Project.createQueryBuilder('project')
      .where(
        `LOWER(project."walletAddress") = '${unchainProjectAddress.toLowerCase()}'`,
      )
      .getOne();
    if (!unchainProject) {
      logger.info(
        `importPoignArtDonations() There is no project with walletAddress of ${unchainProjectAddress} in our db`,
      );
      return;
    }
    const poignArtWithdrawals = await getPoignArtWithdrawals({
      recipient: unchainProjectAddress,
      startTimestamp,
    });
    for (const poignArtWithdrawal of poignArtWithdrawals) {
      await createPoignArtDonationInDb(poignArtWithdrawal, unchainProject);
    }
    await updateUserTotalReceived(Number(unchainProject.admin));
    await updateTotalDonationsOfProject(unchainProject.id);
  } catch (e) {
    logger.error('importPoignArtDonations() error', e);
    throw e;
  }
};

const createPoignArtDonationInDb = async (
  poignArtWithdrawal: PoignArtWithdrawal,
  unchainProject: Project,
) => {
  const ethPrice = (
    await fetchGivHistoricPrice(poignArtWithdrawal.txHash, NETWORK_IDS.MAIN_NET)
  ).ethPriceInUsd;
  const donation = Donation.create({
    project: unchainProject,
    toWalletAddress: unchainProject.walletAddress,
    isProjectVerified: unchainProject.verified,
    fromWalletAddress: poignArtOriginAddress,
    transactionId: poignArtWithdrawal.txHash,
    anonymous: false,

    status: DONATION_STATUS.VERIFIED,
    donationType: DONATION_TYPES.POIGN_ART,
    createdAt: new Date(poignArtWithdrawal.timestamp * 1000),

    // We set it to false, then the other job send notification to projectOwner
    segmentNotified: false,

    priceEth: 1,
    priceUsd: ethPrice,
    valueUsd: ethPrice * poignArtWithdrawal.amount,
    amount: poignArtWithdrawal.amount,

    // PoignArt donations are just ETH in mainnet
    currency: 'ETH',
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
  });
  await donation.save();
};
