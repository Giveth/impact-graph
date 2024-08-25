import { ethers } from 'ethers';
import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';
import config from '../config';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { logger } from './logger';
import { QACC_NETWORK_ID } from '../provider';

const QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP = config.get(
  'QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP',
) as number;
export const QACC_DONATION_TOKEN_ADDRESS: string =
  (config.get('QACC_DONATION_TOKEN_ADDRESS') as string) ||
  ethers.constants.AddressZero;
export const QACC_DONATION_TOKEN_SYMBOL =
  (config.get('QACC_DONATION_TOKEN_SYMBOL') as string) || 'QAT';
export const QACC_DONATION_TOKEN_NAME =
  (config.get('QACC_DONATION_TOKEN_NAME') as string) || 'QAT Name';
export const QACC_DONATION_TOKEN_DECIMALS =
  (+config.get('QACC_DONATION_TOKEN_DECIMALS') as number) || 18;
export const QACC_DONATION_TOKEN_COINGECKO_ID =
  (config.get('QACC_DONATION_TOKEN_COINGECKO_ID') as string) || 'matic-network';

if (!QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP) {
  logger.error('QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP is not set');
}

const isEarlyAccessRound = (earlyAccessRoundFinishTime: number): boolean => {
  return Date.now() / 1000 < earlyAccessRoundFinishTime;
};

const validateDonation = async (params: {
  projectId: number;
  userAddress: string;
  networkId: number;
  tokenSymbol: string;
}): Promise<void> => {
  const { projectId, userAddress, tokenSymbol, networkId } = params;
  // token is matched
  if (
    tokenSymbol !== QACC_DONATION_TOKEN_SYMBOL ||
    networkId !== QACC_NETWORK_ID
  ) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS),
    );
  }
  if (
    isEarlyAccessRound(
      QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP || Number.MAX_SAFE_INTEGER,
    )
  ) {
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
};

export default {
  isEarlyAccessRound,
  validateDonation,
};
