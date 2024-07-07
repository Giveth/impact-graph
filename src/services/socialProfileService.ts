import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import {
  createSocialProfile,
  isSocialNetworkAddedToVerificationForm,
} from '../repositories/socialProfileRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { SocialProfile } from '../entities/socialProfile';
import { generateRandomString } from '../utils/utils';
import { getRedisObject, setObjectInRedis } from '../redis';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';

export const getProjectVerificationFormByState = async (params: {
  state: string;
  socialNetwork: string;
}): Promise<{
  projectVerificationForm: ProjectVerificationForm;
  userId: number;
}> => {
  const { socialNetwork, state } = params;
  const redisData = await getOauth2SocialProfileFromRedis(state);
  if (!redisData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_TRACK_ID_FOR_OAUTH2_LOGIN),
    );
  }
  const {
    socialNetwork: savedSocialNetwork,
    userId,
    projectVerificationFormId,
  } = redisData;
  if (socialNetwork !== savedSocialNetwork) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.INVALID_TRACK_ID_FOR_OAUTH2_LOGIN),
    );
  }
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationFormId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }
  return {
    projectVerificationForm,
    userId,
  };
};

export const oauth2CallbackHandler = async (params: {
  authorizationCodeOrAccessToken: string;
  userId: number;
  socialNetwork: string;
  projectVerificationForm: ProjectVerificationForm;
}): Promise<SocialProfile> => {
  const {
    authorizationCodeOrAccessToken,
    userId,
    socialNetwork,
    projectVerificationForm,
  } = params;
  const oauth2Adapter = getSocialNetworkAdapter(socialNetwork);
  const { username, name, link } = await oauth2Adapter.getUserInfoByOauth2Code({
    oauth2Code: authorizationCodeOrAccessToken as string,
  });
  if (projectVerificationForm.user?.id !== userId) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
      ),
    );
  }

  if (projectVerificationForm.status !== PROJECT_VERIFICATION_STATUSES.DRAFT) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES,
      ),
    );
  }
  const isSocialNetworkAlreadyAdded =
    await isSocialNetworkAddedToVerificationForm({
      socialNetworkId: username,
      socialNetwork,
      projectVerificationFormId: projectVerificationForm.id,
    });
  if (isSocialNetworkAlreadyAdded) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.YOU_ALREADY_ADDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM,
      ),
    );
  }
  return createSocialProfile({
    socialNetwork,
    socialNetworkId: username,
    name,
    link,
    projectVerificationId: projectVerificationForm.id,
    isVerified: true,
  });
};

export const setOauth2SocialProfileInRedis = async (params: {
  socialNetwork: string;
  projectVerificationFormId: number;
  userId: number;
}): Promise<string> => {
  const { projectVerificationFormId, socialNetwork, userId } = params;
  const trackId = generateRandomString();
  const THREE_MINUTES = 60 * 4;
  await setObjectInRedis({
    key: trackId,
    value: {
      projectVerificationFormId,
      socialNetwork,
      userId,
    },
    expirationInSeconds: THREE_MINUTES,
  });
  return trackId;
};

export const getOauth2SocialProfileFromRedis = async (
  trackId: string,
): Promise<{
  projectVerificationFormId: number;
  userId: number;
  socialNetwork: string;
}> => {
  return getRedisObject(trackId);
};
