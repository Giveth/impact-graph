import { getChainvineAdapter } from '../adapters/adaptersFactory';
import { getRoundNumberByDate } from '../utils/powerBoostingUtils';
import { isFirstTimeDonor } from '../repositories/userRepository';
import moment from 'moment';
import { logger } from '../utils/logger';

const isDonationEligibleForReferralReward = (params: {
  firstTimeDonor: boolean;
  currentRound: number;
  referralStartTimeRound: number;
  referralStartTimestamp: number;
}) => {
  const {
    firstTimeDonor,
    currentRound,
    referralStartTimeRound,
    referralStartTimestamp,
  } = params;

  // https://github.com/Giveth/impact-graph/issues/904#issuecomment-1468308288
  if (firstTimeDonor) {
    return currentRound <= referralStartTimeRound + 1;
  } else {
    return (
      moment().toDate() < moment(referralStartTimestamp).add(1, 'days').toDate()
    );
  }
};

export const getChainvineReferralInfoForDonation = async (params: {
  referrerId: string;
  fromAddress: string;
  donorUserId: number;
}): Promise<{
  referrerWalletAddress: string;
  referralStartTimestamp: Date;
  isReferrerGivbackEligible: boolean;
}> => {
  const { referrerId, fromAddress, donorUserId } = params;
  let referralStartTimestamp;
  try {
    const referrerWalletAddress =
      await getChainvineAdapter().getWalletAddressFromReferer(referrerId);
    if (!referrerWalletAddress) {
      throw new Error(`Invalid referrerId`);
    }
    if (referrerWalletAddress !== fromAddress) {
      throw new Error(`User ${fromAddress} tried to refer himself.`);
    }

    referralStartTimestamp =
      await getChainvineAdapter().getReferralStartTimestamp(
        referrerWalletAddress,
      );

    const referralStartTimeRound = getRoundNumberByDate(
      new Date(referralStartTimestamp),
    );
    const currentRound = getRoundNumberByDate(new Date());

    const firstTimeDonor = await isFirstTimeDonor(donorUserId);

    // If either is first time donor or not, and time frame valid
    const isReferrerGivbackEligible = isDonationEligibleForReferralReward({
      referralStartTimeRound: referralStartTimeRound.round,
      currentRound: currentRound.round,
      firstTimeDonor,
      referralStartTimestamp,
    });
    return {
      isReferrerGivbackEligible,
      referralStartTimestamp,
      referrerWalletAddress,
    };
  } catch (e) {
    logger.error('get chainvine wallet address error', e);
    throw e;
  }
};
