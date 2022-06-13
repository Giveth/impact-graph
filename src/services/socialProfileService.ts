import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import {
  findSocialProfileById,
  verifySocialProfileById,
} from '../repositories/socialProfileRepository';
import { errorMessages } from '../utils/errorMessages';
import { SocialProfile } from '../entities/socialProfile';

export const oauth2CallbackHandler = async (params: {
  authorizationCodeOrAccessToken: string;
  state: string;
  socialNetwork: string;
}): Promise<SocialProfile> => {
  const { authorizationCodeOrAccessToken, state, socialNetwork } = params;
  const oauth2Adapter = getSocialNetworkAdapter(socialNetwork);
  const { username } = await oauth2Adapter.getUserInfoByOauth2Code({
    state: state as string,
    oauth2Code: authorizationCodeOrAccessToken as string,
  });
  const socialProfile = await findSocialProfileById(Number(state));
  if (socialProfile?.socialNetworkId !== username) {
    throw new Error(
      errorMessages.VERIFIED_USERNAME_IS_DIFFERENT_WITH_CLAIMED_ONE,
    );
  }
  return verifySocialProfileById({
    socialProfileId: socialProfile?.id,
  });
};
