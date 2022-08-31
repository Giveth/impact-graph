import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { stringify } from 'querystring';
import axios from 'axios';
import { decode, JwtPayload } from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { errorMessages } from '../../utils/errorMessages';

const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const redirectUrl = process.env.LINKEDIN_REDIRECT_URL;

export class LinkedinAdapter implements SocialNetworkOauth2AdapterInterface {
  async getAuthUrl(params: { trackId: string }): Promise<string> {
    const { trackId } = params;
    /**
     * @see {@link https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin%2Fcontext&tabs=HTTPS#step-2-request-an-authorization-code}
     */

    // https://docs.microsoft.com/en-us/linkedin/shared/authentication/getting-access?context=linkedin%2Fcontext#open-permissions-consumer
    const scope = 'r_liteprofile';
    return `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=${trackId}`;
  }

  async getUserInfoByOauth2Code(params: {
    oauth2Code: string;
  }): Promise<GetUserInfoByOauth2Output> {
    /**
     * @see {@link https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin%2Fcontext&tabs=HTTPS#step-3-exchange-authorization-code-for-an-access-token}
     */
    const { oauth2Code } = params;
    try {
      const data = stringify({
        code: oauth2Code,
        client_id: clientId,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
        client_secret: clientSecret,
      });
      const result = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      /** get token response sample
      *
        {
          "access_token": "AQXNnd2kXITHELmWblJigbHEuoFdfRhOwGA0QNnumBI8X...",
          "expires_in": 5184000
        }
      */
      const accessToken = result.data.access_token;

      /**
       * @see {@link https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin?context=linkedin%2Fconsumer%2Fcontext#api-request}
       */
      const meResult = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      /**
       * sample response
           {
               "id":"REDACTED",
               "firstName":{
                  "localized":{
                     "en_US":"Tina"
                  },
                  "preferredLocale":{
                     "country":"US",
                     "language":"en"
                  }
               },
               "lastName":{
                  "localized":{
                     "en_US":"Belcher"
                  },
                  "preferredLocale":{
                     "country":"US",
                     "language":"en"
                  }
               },
                "profilePicture": {
                    "displayImage": "urn:li:digitalmediaAsset:B54328XZFfe2134zTyq"
                }
           }
       */
      const username = meResult.data.id;
      let name = username;
      if (
        meResult.data?.firstName?.localized?.en_US ||
        meResult.data?.lastName?.localized?.en_US
      ) {
        name = `${meResult.data?.firstName?.localized?.en_US || ''} ${
          meResult.data?.lastName?.localized?.en_US || ''
        }`.trim();
      }
      return {
        username,
        name,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code linkedin error', e);
      throw new Error(
        errorMessages.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
      );
    }
  }
}
