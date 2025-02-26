import { getProvider, NETWORK_IDS } from '../../provider';
import { Project, ProjStatus } from '../../entities/project';
import { i18n, translationErrorMessagesKeys } from '../errorMessages';
import { logger } from '../logger';
import { findRelatedAddressByWalletAddress } from '../../repositories/projectAddressRepository';
import { RelatedAddressInputType } from '../../resolvers/types/ProjectVerificationUpdateInput';
import { findProjectById } from '../../repositories/projectRepository';
import { titleWithoutSpecialCharacters } from '../utils';
import { ChainType } from '../../types/network';
import { detectAddressChainType } from '../networks';

export function isWalletAddressValid(address, chainType?: ChainType) {
  if (!address) {
    return false;
  }
  const detectedChainType = detectAddressChainType(address);
  return chainType === undefined
    ? detectedChainType !== undefined
    : chainType === detectedChainType;
}

export const validateProjectWalletAddress = async (
  walletAddress: string,
  projectId?: number,
  chainType?: ChainType,
  memo?: string,
): Promise<boolean> => {
  if (!isWalletAddressValid(walletAddress, chainType)) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_WALLET_ADDRESS),
    );
  }
  // const isSmartContractWallet = await isWalletAddressSmartContract(
  //   walletAddress,
  // );
  // if (isSmartContractWallet) {
  //   throw new Error(
  //     `Address ${walletAddress} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
  //   );
  // }
  const relatedAddress = await findRelatedAddressByWalletAddress(
    walletAddress,
    chainType,
    memo,
  );
  if (relatedAddress && relatedAddress?.project?.id !== projectId) {
    if (chainType === ChainType.STELLAR && memo) {
      throw new Error(
        `Address ${walletAddress} is already being used for a project with the same MEMO. Please enter a different address or a different MEMO`,
      );
    } else {
      throw new Error(
        `Address ${walletAddress} is already being used for a project`,
      );
    }
  }
  return true;
};
export const validateProjectRelatedAddresses = async (
  relatedAddresses: RelatedAddressInputType[],
  projectId?: number,
): Promise<void> => {
  if (relatedAddresses.length === 0) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.RECIPIENT_ADDRESSES_CANT_BE_EMPTY),
    );
  }
  for (const relateAddress of relatedAddresses) {
    await validateProjectWalletAddress(
      relateAddress.address,
      projectId,
      relateAddress.chainType,
    );
  }
};

const titleReplacerRegex = /^\s+|\s+$|\s+(?=\s)/g;

export const validateProjectTitleForEdit = async (
  title: string,
  projectId: number,
) => {
  const project = await findProjectById(projectId);
  if (
    getSimilarTitleInProjectsRegex(project?.title as string).test(
      title.replace(titleReplacerRegex, ''),
    )
  ) {
    // If the new title of project is similar to older one , we dont call validateProjectTitle
    return true;
  }
  return validateProjectTitle(title);
};

export const getSimilarTitleInProjectsRegex = (title: string): RegExp => {
  return new RegExp(
    `^\\s*${titleWithoutSpecialCharacters(title).replace(
      titleReplacerRegex,
      '',
    )}\\s*$`,
    'i',
  );
};

export const validateProjectTitle = async (title: string): Promise<boolean> => {
  const isTitleValid = /^[a-zA-Z0-9?!@#$%^&*+=._|/<">`'-]+$/.test(
    // https://github.com/Giveth/giveth-dapps-v2/issues/1975#issuecomment-1383112084
    title.replace(/\s/g, ''),
  );
  if (!isTitleValid) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_TITLE),
    );
  }
  const regex = getSimilarTitleInProjectsRegex(title);
  logger.debug('regexSource', {
    title,
    regex,
    query: `SELECT title , REGEXP_MATCHES(title, '${regex.source}','i') FROM project`,
  });
  const projectWithThisTitle = await Project.query(
    `SELECT title , REGEXP_MATCHES(title, '${regex.source}','i') FROM project`,
  );
  logger.debug(
    'validateProjectTitle projectWithThisTitle',
    projectWithThisTitle,
  );

  if (projectWithThisTitle.length > 0) {
    logger.debug(
      'validateProjectTitle projectWithThisTitle',
      projectWithThisTitle,
    );
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_WITH_THIS_TITLE_EXISTS),
    );
  }
  return true;
};

export const isWalletAddressSmartContract = async (
  address: string,
): Promise<boolean> => {
  const networkIds = [
    NETWORK_IDS.MAIN_NET,
    NETWORK_IDS.XDAI,
    NETWORK_IDS.POLYGON,
    NETWORK_IDS.CELO,
    NETWORK_IDS.CELO_ALFAJORES,
    NETWORK_IDS.ARBITRUM_MAINNET,
    NETWORK_IDS.ARBITRUM_SEPOLIA,
    NETWORK_IDS.BASE_MAINNET,
    NETWORK_IDS.BASE_SEPOLIA,
    NETWORK_IDS.ZKEVM_MAINNET,
    NETWORK_IDS.ZKEVM_CARDONA,
  ];

  const _isSmartContracts = await Promise.all(
    networkIds.map(async networkId => {
      const provider = getProvider(networkId);
      return await isSmartContract(provider, address);
    }),
  );

  return _isSmartContracts.some(_isSmartContract => Boolean(_isSmartContract));
};

async function isSmartContract(provider, projectWalletAddress) {
  const code = await provider.getCode(projectWalletAddress);
  return code !== '0x';
}

export const canUserVisitProject = (
  project?: Project | null,
  userId?: number,
) => {
  if (!project) {
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
  }

  // Get admin user id from project or admin user
  const adminUserId =
    project.adminUserId && project.adminUserId > 0
      ? project.adminUserId
      : project.adminUser.id && project.adminUser.id > 0
        ? project.adminUser.id
        : null;

  // If project is draft or cancelled, just owner can view it
  if (
    (project.status.id === ProjStatus.drafted ||
      project.status.id === ProjStatus.cancelled) &&
    adminUserId !== userId
  ) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
      ),
    );
  }
};
