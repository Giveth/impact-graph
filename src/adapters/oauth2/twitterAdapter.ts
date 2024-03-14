import { auth } from 'twitter-api-sdk';
import { OAuth2User } from 'twitter-api-sdk/dist/OAuth2User';
import axios from 'axios';
import { logger } from '../../utils/logger';
import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';

export class TwitterAdapter implements SocialNetworkOauth2AdapterInterface {
  private authClient: OAuth2User;
  constructor() {
    this.authClient = new auth.OAuth2User({
      client_id: process.env.TWITTER_CLIENT_ID as string,
      client_secret: process.env.TWITTER_CLIENT_SECRET,
      callback: process.env.TWITTER_CALLBACK_URL as string,
      scopes: ['users.read', 'tweet.read'],
    });
  }
  async getAuthUrl(params: { trackId: string }): Promise<string> {
    return this.authClient.generateAuthURL({
      code_challenge_method: 's256',
      state: params.trackId,
    });
  }

  async getUserInfoByOauth2Code(params: {
    oauth2Code: string;
  }): Promise<GetUserInfoByOauth2Output> {
    try {
      logger.debug('getUserInfoByOauth2Code code', params.oauth2Code);
      const accessToken = await this.authClient.requestAccessToken(
        params.oauth2Code,
      );
      logger.debug('getUserInfoByOauth2Code accessToken', accessToken);

      // https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me#tab0
      const meResult = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken.token.access_token}`,
        },
      });
      logger.debug('getUserInfoByOauth2Code meResult', meResult.data);
      /**
       * sample response
       * {
            "data": {
              "id": "2244994945",
              "name": "TwitterDev",
              "username": "Twitter Dev"
            }
          }
       */
      const username = meResult?.data?.data?.username as string;
      return {
        username,
        link: `https://twitter.com/${username}`,
        name: meResult?.data?.data?.name as string,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code error', e);
      throw e;
    }
  }
}
