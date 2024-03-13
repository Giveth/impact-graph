import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

export class MockOauth2Adapter implements SocialNetworkOauth2AdapterInterface {
  async getAuthUrl(): Promise<string> {
    // return `${process.env.GIVETH_IO_BACKEND_BASE_URL}/socialProfiles/callback/${socialProfile?.socialNetwork}`;
    throw new Error(i18n.__(translationErrorMessagesKeys.NOT_IMPLEMENTED));
  }

  async getUserInfoByOauth2Code(): Promise<GetUserInfoByOauth2Output> {
    // const socialProfile = await findSocialProfileById(Number(params.state));
    // if (!socialProfile) {
    //   logger.error('getUserInfoByOauth2Code mockAdapter error');
    //   throw new Error(i18n.__(translationErrorMessagesKeys.SOCIAL_PROFILE_NOT_FOUND));
    // }
    // return {
    //   username: socialProfile.socialNetworkId,
    // };
    throw new Error(i18n.__(translationErrorMessagesKeys.NOT_IMPLEMENTED));
  }
}
