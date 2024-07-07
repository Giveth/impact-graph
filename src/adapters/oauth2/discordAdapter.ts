import axios from 'axios';
import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { logger } from '../../utils/logger';

export class DiscordAdapter implements SocialNetworkOauth2AdapterInterface {
  // https://discordjs.guide/oauth2/#getting-an-oauth2-url
  async getAuthUrl(params: { trackId: string }): Promise<string> {
    const { trackId } = params;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${process.env.DISCORD_REDIRECT_URL}&response_type=token&scope=identify&state=${trackId}`;
    return url;
  }

  async getUserInfoByOauth2Code(params: {
    oauth2Code: string;
  }): Promise<GetUserInfoByOauth2Output> {
    // https://discordjs.guide/oauth2/#implicit-grant-flow we can get accessToken directly from discord url
    // but the standard way is to get code here and get access token by code with calling another webservice
    const { oauth2Code: accessToken } = params;
    /** Discord response sample
     * {
        "id": "90348593728975495032",
        "username": "username",
        "avatar": "4c7a12fee8100fb8fd5d231f8feb2345",
        "avatar_decoration": null,
        "discriminator": "2709",
        "public_flags": 0,
        "flags": 0,
        "banner": null,
        "banner_color": null,
        "accent_color": null,
        "locale": "en-US",
        "mfa_enabled": false
      }
     */
    try {
      const result = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const username = result.data.username;
      return {
        username,
        // Can't open profile link with this address so I commented it
        // link: `https://discordapp.com/users/${username}`,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code discord error', e);
      throw e;
    }
  }
}
