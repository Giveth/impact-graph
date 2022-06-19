import {
  GetUserInfoByOauth2Output,
  SocialNetworkOauth2AdapterInterface,
} from './SocialNetworkOauth2AdapterInterface';
import { findSocialProfileById } from '../../repositories/socialProfileRepository';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';

export class MockOauth2Adapter implements SocialNetworkOauth2AdapterInterface {
  async getAuthUrl(params: { trackId: string }): Promise<string> {
    // return `${process.env.GIVETH_IO_BACKEND_BASE_URL}/socialProfiles/callback/${socialProfile?.socialNetwork}`;
    throw new Error(errorMessages.NOT_IMPLEMENTED);
  }

  async getUserInfoByOauth2Code(params: {
    oauth2Code: string;
    state: string;
  }): Promise<GetUserInfoByOauth2Output> {
    // const socialProfile = await findSocialProfileById(Number(params.state));
    // if (!socialProfile) {
    //   logger.error('getUserInfoByOauth2Code mockAdapter error');
    //   throw new Error(errorMessages.SOCIAL_PROFILE_NOT_FOUND);
    // }
    // return {
    //   username: socialProfile.socialNetworkId,
    // };
    throw new Error(errorMessages.NOT_IMPLEMENTED);
  }
}
