import Axios, { AxiosResponse } from 'axios';
import config from '../../config';

const apiBaseUrl = config.get('GIVING_BLOCKS_URL') as string;
const websiteBaseUrl = config.get('GIVING_BLOCKS_WEBSITE_URL') as string;

import cheerio from 'cheerio';

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

// Example
// {
// 	   "organizationId": 99,
//     "isAnonymous": false,
//     "pledgeCurrency": "ETH",
//     "pledgeAmount": "0.0001",
//     "firstName": "John",
//     "lastName": "Doe",
//     "receiptEmail": "some-donor-email@domain.com",
//     "addressLine1": "My street 1",
//     "addressLine2": "apt 2",
//     "country": "US",
//     "state": "NY",
//     "city": "New York",
//     "zipcode": "4422211"
// }

type OrganizationDataType = {
  organizationId: number;
  isAnonymous: boolean;
  pledgeAmount: string;
  pledgeCurrency: string;
  firstName: string;
  lastName: string;
  receiptEmail: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
}

type AnonymousDonationType = {
    organizationId: number;
    isAnonymous: boolean;
    pledgeAmount: string;
    pledgeCurrency: string;
}

export const depositAddress = (accessToken:string, organizationData: AnonymousDonationType): Promise<AxiosResponse> => {
    return Axios.post(
        `${apiBaseUrl}/v1/deposit-address`,
        organizationData,
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
