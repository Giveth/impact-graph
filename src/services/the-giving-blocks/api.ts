import Axios, { AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import config from '../../config';
import { logger } from '../../utils/logger';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;

// Maximum timeout of axios.
const axiosTimeout = 3000;

// Set high Number to prevent address disposability
// Doesn't seem to affect api functionality
const pledgeAmount = '99999999999';

// set it as the base ethereum chain for all ERC20 tokens
const pledgeCurrenty = 'ETH';

// Handle API timeouts and internal server errors with a retry + delay
axiosRetry(Axios, {
  retries: 3,
  retryDelay: retryCount => {
    logger.debug(`Axios Retry attempt: ${retryCount}`);
    return retryCount * 1000; // time interval between retries
  },
  retryCondition: error => {
    if (!error?.response?.status) return true;
    return error.response!.status === 500;
  },
});

export const loginGivingBlocks = async (): Promise<{
  accessToken: string;
}> => {
  try {
    const result = await Axios.post(
      `${apiBaseUrl}/v1/login`,
      {
        login: config.get('GIVING_BLOCKS_USER') as string,
        password: config.get('GIVING_BLOCKS_PASSWORD') as string,
      },
      {
        headers: { 'Content-Type': `application/json` },
      },
    );
    return result.data.data;
  } catch (e) {
    logger.error('giving block service login() err', e);
    throw e;
  }
};

export const getRefreshToken = (
  refreshToken: string,
): Promise<AxiosResponse> => {
  return Axios.post(
    `${apiBaseUrl}/v1/refresh-tokens`,
    {
      refreshToken,
    },
    {
      headers: { 'Content-Type': `application/json` },
    },
  );
};

export interface GivingBlockProject {
  id: number;
  name: string;
  logo: string;
  allowsAnon: boolean;
  websiteBlocks: WebsiteBlocks;
}

interface WebsiteBlocks {
  missionStatement: BlockValue;
  youtubeUrl: BlockValue;
  url: BlockValue;
}

interface BlockValue {
  value: string;
}

export const fetchGivingBlockProjects = async (
  accessToken: string,
): Promise<GivingBlockProject[]> => {
  try {
    const result = await Axios.get(`${apiBaseUrl}/v1/organizations/list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: axiosTimeout,
    });

    return result?.data?.data?.organizations;
  } catch (e) {
    logger.error('giving block service fetchGivingBlockProjects() err', e);
    throw e;
  }
};

export const fetchOrganizationById = async (
  accessToken: string,
  organizationId: number,
): Promise<GivingBlockProject> => {
  try {
    const result = await Axios.get(
      `${apiBaseUrl}/v1/organization/${organizationId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: axiosTimeout,
      },
    );

    return result?.data?.data?.organization;
  } catch (e) {
    logger.error('giving block service fetchOrganizationById() err', e);
    throw e;
  }
};

export const generateGivingBlockDepositAddress = async (
  accessToken: string,
  organizationId: number,
): Promise<string> => {
  try {
    const result = await Axios.post(
      `${apiBaseUrl}/v1/deposit-address`,
      {
        isAnonymous: true,
        pledgeAmount,
        pledgeCurrency: pledgeCurrenty,
        organizationId,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: axiosTimeout,
      },
    );
    return result.data.data.depositAddress;
  } catch (e) {
    logger.error('giving block service depositAddress() err', e);
    throw e;
  }
};
