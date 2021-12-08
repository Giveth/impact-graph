import Axios, { AxiosResponse } from 'axios';
import config from '../../config';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;

// Set high Number to prevent address disposability
// Doesn't seem to affect api functionality
const pledgeAmount = '99999999999';

// set it as the base ethereum chain for all ERC20 tokens
const pledgeCurrenty = 'ETH';

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

    return result?.data?.data?.organizations;
  } catch (e) {
    console.log('giving block service fetchGivingBlockProjects() err', e);
    throw e;
  }
};

export const fetchOrganizationById = async (
  accessToken: string,
  organizationId: number,
) => {
  try {
    const result = await Axios.get(
      `${apiBaseUrl}/v1/organization/${organizationId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return result?.data?.data?.organization;
  } catch (e) {
    console.log('giving block service fetchOrganizationById() err', e);
    throw e;
  }
};

export const generateGivingBlockDepositAddress = async (
  accessToken: string,
  organizationId: number,
): Promise<string> => {
  console.log(organizationId);
  try {
    const result = await Axios.post(
      `${apiBaseUrl}/v1/deposit-address`,
      {
        isAnonymous: true,
        pledgeAmount: pledgeAmount,
        pledgeCurrency: pledgeCurrenty,
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
