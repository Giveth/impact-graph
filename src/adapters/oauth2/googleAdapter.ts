import { stringify } from 'querystring';
import axios from 'axios';
import { decode, JwtPayload } from 'jsonwebtoken-esm';
import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface.js';
import { logger } from '../../utils/logger.js';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../utils/errorMessages.js';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUrl = process.env.GOOGLE_REDIRECT_URL;

export class GoogleAdapter implements SocialNetworkOauth2AdapterInterface {
  /**
   * @see {@link https://developers.google.com/identity/protocols/oauth2/openid-connect#sendauthrequest}
   */

  async getAuthUrl(params: { trackId: string }): Promise<string> {
    const { trackId } = params;
    // URL sample https://accounts.google.com/o/oauth2/auth?client_id=639942480910-ssnuetakmjmpgek68b4eu1s1cvbi9k0f.apps.googleusercontent.com&redirect_uri=http://localhost:3040/socialProfiles/callback/google&scope=openid%20email&response_type=code
    return `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUrl}&scope=openid%20email&response_type=code&state=${trackId}`;
  }

  async getUserInfoByOauth2Code(params: {
    oauth2Code: string;
  }): Promise<GetUserInfoByOauth2Output> {
    /**
     * @see {@link https://developers.google.com/identity/protocols/oauth2/openid-connect#sendauthrequest}
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
        'https://accounts.google.com/o/oauth2/token',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      /** get token response sample
       * {
              "access_token": "ya29.a0ARrdaM8wqMAcHNmP-ZAUqWEKLP7Xm2QQzQrC4sCN8-v7y_o3Fcc-A9vXvKe3W_sHEzzxqJNYy512vMYPMZKoFANRPxzvcub0wCFb6ZVoofP91NIB920nEUzz8zlLAA1upxmOVoyTA1iGm3Ioi41fncqCbw8V",
              "expires_in": 3600,
              "scope": "openid https://www.googleapis.com/auth/userinfo.email",
              "token_type": "Bearer",
              "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiNjM5OTQyNDgwOTEwLXNzbnVldGFrbWptcGdlazY4YjRldTFzMWN2Ymk5azBmLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiNjM5OTQyNDgwOTEwLXNzbnVldGFrbWptcGdlazY4YjRldTFzMWN2Ymk5azBmLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTEyMzEzMDE0OTYzMDY1Njk4NDQxIiwiZW1haWwiOiJtb2hhbW1hZEBnaXZldGguY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJTamVIVTlwMXJnM1FleDhNN3VFQzJnIiwiaWF0IjoxNjU1MDk5OTYwLCJleHAiOjE2NTUxMDM1NjB9.md5WHQaPgjsEUEyZ3d1ufJJ0ogaT4W8dXKyJ3FOSI7U"
          }
       */
      const idToken = result.data.id_token;
      const userInfo = decode(idToken);
      /** id token payload
       * {
            "iss": "accounts.google.com",
            "azp": "639942480910-ssnuetakmjmpgek68b4eu1s1cvbi9k0f.apps.googleusercontent.com",
            "aud": "639942480910-ssnuetakmjmpgek68b4eu1s1cvbi9k0f.apps.googleusercontent.com",
            "sub": "112313014963065698441",
            "email": "mohammad@giveth.com",
            "email_verified": true,
            "at_hash": "SjeHU9p1rg3Qex8M7uEC2g",
            "iat": 1655099960,
            "exp": 1655103560
          }
       */
      return {
        username: (userInfo as JwtPayload).email,
      };
    } catch (e) {
      logger.error('getUserInfoByOauth2Code google error', e);
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
      );
    }
  }
}
