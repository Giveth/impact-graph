import Axios, { AxiosResponse } from 'axios';
import config from '../../config';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;

// Anonymous Disposable Address to be created for the project
// Need to decide how to accept multiple currencies
// Setting it as a ethereum address for now
const OrganizationWalletData = {
    isAnonymous: true,
    pledgeAmount: '0.1',
    pledgeCurrency: 'ETH'
}

export const login = (): Promise<AxiosResponse> => {
    return Axios.post(
        `${apiBaseUrl}/v1/login`,
        {
            login: config.get('GIVING_BLOCKS_USER') as string,
            password: config.get('GIVING_BLOCKS_PASSWORD') as string,
        },
        {
            headers: { 'Content-Type': `application/json` }
        }
    );
}

export const refreshToken = (refreshToken: string): Promise<AxiosResponse> => {
    return Axios.post(
        `${apiBaseUrl}/v1/refresh-tokens`,
        {
            refreshToken: refreshToken
        },
        {
            headers: { 'Content-Type': `application/json` }
        }
    );
};

export const organizations = (accessToken: string): Promise<AxiosResponse> => {
    return Axios.get(
        `${apiBaseUrl}/v1/organizations/list`,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );
};

export const organizationById = (accessToken: string, organizationId: number): Promise<AxiosResponse> => {
    return Axios.get(
        `${apiBaseUrl}/v1/organization/${organizationId}`,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );
};

export const depositAddress = (accessToken:string, organizationId: number): Promise<AxiosResponse> => {
    OrganizationWalletData['organizationId'] = organizationId;

    return Axios.post(
        `${apiBaseUrl}/v1/deposit-address`,
        OrganizationWalletData,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );
};
