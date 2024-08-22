import { getAbcLauncherAdapter } from '../adapters/adaptersFactory';
import config from '../config';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { logger } from './logger';

const QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP = config.get(
  'QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP',
) as number;
const QACC_DONATION_TOKEN_ADDRESS =
  config.get('QACC_DONATION_TOKEN_ADDRESS') || '';

if (!QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP) {
  logger.error('QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP is not set');
}

const isEarlyAccessRound = (earlyAccessRoundFinishTime: number): boolean => {
  return Date.now() / 1000 < earlyAccessRoundFinishTime;
};

const validateDonation = async (
  projectId: number,
  userAddress: string,
  tokenAddress: string,
): Promise<void> => {
  // token is matched
  if (tokenAddress.toLocaleLowerCase() !== QACC_DONATION_TOKEN_ADDRESS) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_TOKEN_ADDRESS),
    );
  }
  if (
    isEarlyAccessRound(
      QACC_EARLY_ACCESS_ROUND_FINISH_TIMESTAMP || Number.MAX_SAFE_INTEGER,
    )
  ) {
    const project = await Project.findOne({
      where: { id: projectId },
      select: ['abc'],
    });
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
