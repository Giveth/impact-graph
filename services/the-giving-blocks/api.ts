import Axios, { AxiosResponse } from 'axios';
import config from '../../config';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;

// Anonymous Disposable Address to be created for the project
// Need to decide how to accept multiple currencies
// Setting it as a ethereum address for now
const OrganizationWalletData = {
  isAnonymous: true,
  pledgeAmount: '0.1',
  pledgeCurrency: 'ETH',
};

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
    console.log('giving block service login() err', e);
    throw e;
  }
};

export const refreshToken = (refreshToken: string): Promise<AxiosResponse> => {
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
}
export const fetchGivingBlockProjects = async (
  accessToken: string,
): Promise<GivingBlockProject[]> => {
  try {
    const result = await Axios.get(`${apiBaseUrl}/v1/organizations/list`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Maybe result.data.data.organizations
    return result.data.organizations;
  } catch (e) {
    console.log('giving block service fetchGivingBlockProjects() err', e);
    throw e;
  }
};

export const organizationById = (
  accessToken: string,
  organizationId: number,
): Promise<AxiosResponse> => {
  return Axios.get(`${apiBaseUrl}/v1/organization/${organizationId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
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
        pledgeAmount: '0.1',
        pledgeCurrency: 'ETH',
        organizationId,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return result.data.data.depositAddress;
  } catch (e) {
    console.log('giving block service depositAddress() err');
    throw e;
  }
};
