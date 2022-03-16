import { getProvider, NETWORK_IDS } from '../../provider';
import { Project, ProjStatus } from '../../entities/project';
import Web3 from 'web3';
import { errorMessages } from '../errorMessages';
import { logger } from '../logger';

export function isWalletAddressValid(address) {
  return Boolean(
    address && address.length === 42 && Web3.utils.isAddress(address),
  );
}

export const validateProjectWalletAddress = async (
  walletAddress: string,
  projectId?: number,
): Promise<boolean> => {
  if (!isWalletAddressValid(walletAddress)) {
    throw new Error(errorMessages.INVALID_WALLET_ADDRESS);
  }
  const isSmartContractWallet = await isWalletAddressSmartContract(
    walletAddress,
  );
  if (isSmartContractWallet) {
    throw new Error(
      `Eth address ${walletAddress} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`,
    );
  }
  const projectWithAddress = await Project.createQueryBuilder('project')
    .where(`lower("walletAddress")=lower(:walletAddress )`, {
      walletAddress,
    })
    .getOne();
  if (projectWithAddress && projectWithAddress.id !== projectId) {
    throw new Error(
      `Eth address ${walletAddress} is already being used for a project`,
    );
  }
  return true;
};

const titleReplacerRegex = /^\s+|\s+$|\s+(?=\s)/g;

export const validateProjectTitleForEdit = async (
  title: string,
  projectId: number,
) => {
  const project = await Project.findOne(projectId);
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
  return new RegExp(`^\\s*${title.replace(titleReplacerRegex, '')}\\s*$`, 'i');
};

export const validateProjectTitle = async (title: string): Promise<boolean> => {
  const isTitleValid = /^\w+$/.test(title.replace(/\s/g, ''));
  if (!isTitleValid) {
    throw new Error(errorMessages.INVALID_PROJECT_TITLE);
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
    throw new Error(errorMessages.PROJECT_WITH_THIS_TITLE_EXISTS);
  }
  return true;
};

export const isWalletAddressSmartContract = async (
  address: string,
): Promise<boolean> => {
  const mainnetProvider = getProvider(NETWORK_IDS.MAIN_NET);
  const xdaiProvider = getProvider(NETWORK_IDS.XDAI);
  const isSmartContractMainnet = isSmartContract(mainnetProvider);
  const isSmartContractXDai = isSmartContract(xdaiProvider);
  const isContractPromises: any = [];
  isContractPromises.push(isSmartContractMainnet(address));
  isContractPromises.push(isSmartContractXDai(address));

  return Promise.all(isContractPromises).then(promises => {
    const [isSmartContractOnMainnet, isSmartContractOnXDai] = promises;
    return Boolean(isSmartContractOnMainnet || isSmartContractOnXDai);
  });
};

function isSmartContract(provider) {
  return async projectWalletAddress => {
    const code = await provider.getCode(projectWalletAddress);
    return code !== '0x';
  };
}

export const canUserVisitProject = (project?: Project, userId?: string) => {
  if (!project) {
    throw new Error(errorMessages.PROJECT_NOT_FOUND);
  }
  if (
    (project.status.id === ProjStatus.drafted ||
      project.status.id === ProjStatus.cancelled) &&
    // If project is draft or cancelled, just owner can view it
    project.admin !== userId
  ) {
    throw new Error(errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT);
  }
};
