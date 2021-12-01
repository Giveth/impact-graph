import Axios, { AxiosResponse } from 'axios';
import config from '../../config';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;
const websiteBaseUrl = config.get('GIVING_BLOCKS_WEBSITE_URL') as string;

import cheerio from 'cheerio';

type AnonymousWalletType = {
    organizationId: number;
    isAnonymous: boolean;
    pledgeAmount: string;
    pledgeCurrency: string;
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
}

export const depositAddress = (accessToken:string, organizationWalletData: AnonymousWalletType): Promise<AxiosResponse> => {
    return Axios.post(
        `${apiBaseUrl}/v1/deposit-address`,
        organizationWalletData,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );
}

export const projectDescription = async (slug: string) => {
    const givingBlocksWebsite = await Axios.get(`${websiteBaseUrl}/${slug}`)
    const $ = cheerio.load(givingBlocksWebsite.data);
    const [description] = $('.et_pb_text_inner')

    return $(description).find('p').text();
}
