import { stringify } from 'querystring';
import axios from 'axios';
import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { logger } from '../../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

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
    const scope = 'openid profile email';
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
      @see {@link https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2?context=linkedin%2Fconsumer%2Fcontext#api-request-to-retreive-member-details}
      */
      const meResult = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      /**
       * New Sample response
       * {
       *   "sub": "782bbtaQ",
       *   "name": "John Doe",
       *   "given_name": "John",
       *   "family_name": "Doe",
       *   "picture": "https://media.licdn-ei.com/dms/image/C5F03AQHqK8v7tB1HCQ/profile-displayphoto-shrink_100_100/0/",
       *   "locale": "en-US",
       *   "email": "doe@email.com",
       *   "email_verified": true
       * }
       */
      const username = meResult.data.sub;

      const name =
        meResult.data.name ||
        `${meResult.data.given_name || ''} ${meResult.data.family_name || ''}`.trim();
      return {
        username,
        name,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code linkedin error', e);
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
      );
    }
  }
}
