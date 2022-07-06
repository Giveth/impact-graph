import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { auth, Client } from 'twitter-api-sdk';
import { OAuth2User } from 'twitter-api-sdk/dist/OAuth2User';
import { logger } from '../../utils/logger';

export class TwitterAdapter implements SocialNetworkOauth2AdapterInterface {
  private client: Client;
  private authClient: OAuth2User;
  constructor() {
    this.authClient = new auth.OAuth2User({
      client_id: process.env.TWITTER_CLIENT_ID as string,
      client_secret: process.env.TWITTER_CLIENT_SECRET,
      callback: process.env.TWITTER_CALLBACK_URL as string,
      scopes: ['users.read'],
    });
    this.client = new Client(this.authClient);
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
      logger.info('getUserInfoByOauth2Code code', params.oauth2Code)
      const accessToken = await this.authClient.requestAccessToken(
        params.oauth2Code,
      );
      return {
        username: accessToken.token.access_token as string,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code error', e)
      throw e
    }
  }
}
