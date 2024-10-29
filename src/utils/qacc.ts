import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { QACC_NETWORK_ID } from '../provider';
import { findActiveEarlyAccessRound } from '../repositories/earlyAccessRoundRepository';
import { QACC_DONATION_TOKEN_SYMBOL } from '../constants/qacc';
import {
  createUserWithPublicAddress,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import qAccService from '../services/qAccService';

const isEarlyAccessRound = async () => {
  const earlyAccessRound = await findActiveEarlyAccessRound();
  return !!earlyAccessRound;
};

const validateDonation = async (params: {
  projectId: number;
  userAddress: string;
  networkId: number;
  tokenSymbol: string;
  amount: number;
  donateTime: Date;
}): Promise<boolean> => {
  const { projectId, userAddress, tokenSymbol, networkId, donateTime } = params;

  let user = await findUserByWalletAddress(userAddress)!;
  if (!user) {
    user = await createUserWithPublicAddress(userAddress);
  }

  const cap = await qAccService.getQAccDonationCap({
    userId: user.id,
    projectId,
    donateTime,
  });

  // if (cap < params.amount) {
  //   throw new Error(i18n.__(translationErrorMessagesKeys.EXCEED_QACC_CAP));
  // }

  // token is matched
  if (
    tokenSymbol !== QACC_DONATION_TOKEN_SYMBOL ||
    networkId !== QACC_NETWORK_ID
  ) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS),
    );
  }
  if (await isEarlyAccessRound()) {
    const [project] =
      (await Project.query('select abc from project where id=$1', [
        projectId,
      ])) || [];

    if (!project?.abc) {
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_ID));
    }
    if (
      (await getAbcLauncherAdapter().ownsNFT(
        project.abc.nftContractAddress,
        userAddress,
      )) === false
    ) {
      throw new Error(i18n.__(translationErrorMessagesKeys.NOT_NFT_HOLDER));
    }
  }

  return cap >= params.amount;
};

export default {
  isEarlyAccessRound,
  validateDonation,
};
