import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';
import config from '../config';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { QACC_NETWORK_ID } from '../provider';
import { findActiveEarlyAccessRound } from '../repositories/earlyAccessRoundRepository';

export const QACC_DONATION_TOKEN_ADDRESS: string =
  (config.get('QACC_DONATION_TOKEN_ADDRESS') as string) ||
  '0xa2036f0538221a77A3937F1379699f44945018d0'; //https://zkevm.polygonscan.com/token/0xa2036f0538221a77a3937f1379699f44945018d0#readContract
export const QACC_DONATION_TOKEN_SYMBOL =
  (config.get('QACC_DONATION_TOKEN_SYMBOL') as string) || 'QAT';
export const QACC_DONATION_TOKEN_NAME =
  (config.get('QACC_DONATION_TOKEN_NAME') as string) || 'QAT Name';
export const QACC_DONATION_TOKEN_DECIMALS =
  (+config.get('QACC_DONATION_TOKEN_DECIMALS') as number) || 18;
export const QACC_DONATION_TOKEN_COINGECKO_ID =
  (config.get('QACC_DONATION_TOKEN_COINGECKO_ID') as string) || 'matic-network';

const isEarlyAccessRound = async () => {
  const earlyAccessRound = await findActiveEarlyAccessRound();
  return !!earlyAccessRound;
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
};

export default {
  isEarlyAccessRound,
  validateDonation,
};
