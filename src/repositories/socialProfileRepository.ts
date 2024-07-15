import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages.js';
import { SocialProfile } from '../entities/socialProfile.js';
import { findProjectVerificationFormById } from './projectVerificationRepository.js';
// TODO should write test cases for all of these functions

export const createSocialProfile = async (params: {
  projectVerificationId: number;
  socialNetwork: string;
  name?: string;
  link?: string;
  socialNetworkId: string;
  isVerified: boolean;
}): Promise<SocialProfile> => {
  const {
    projectVerificationId,
    socialNetworkId,
    name,
    link,
    isVerified,
    socialNetwork,
  } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  return SocialProfile.create({
    project: projectVerificationForm?.project,
    user: projectVerificationForm?.user,
    projectVerificationForm,
    socialNetwork,
    socialNetworkId,
    isVerified,
    name,
    link,
  } as SocialProfile).save();
};

export const findSocialProfileById = async (
  socialProfileId: number,
): Promise<SocialProfile | null> => {
  return SocialProfile.createQueryBuilder('social_profile')
    .where({
      id: socialProfileId,
    })
    .leftJoinAndSelect('social_profile.project', 'project')
    .leftJoinAndSelect('social_profile.user', 'user')
    .leftJoinAndSelect(
      'social_profile.projectVerificationForm',
      'projectVerificationForm',
    )
    .getOne();
};

export const findSocialProfileBySocialNetworkIdAndSocialNetwork =
  async (params: {
    socialNetworkId: string;
    socialNetwork: string;
  }): Promise<SocialProfile | null> => {
    const { socialNetworkId, socialNetwork } = params;
    return SocialProfile.createQueryBuilder('social_profile')
      .where({
        socialNetworkId,
        socialNetwork,
      })
      .leftJoinAndSelect('social_profile.project', 'project')
      .leftJoinAndSelect('social_profile.user', 'user')
      .leftJoinAndSelect(
        'social_profile.projectVerificationForm',
        'projectVerificationForm',
      )
      .getOne();
  };

export const isSocialNetworkAddedToVerificationForm = async (params: {
  socialNetworkId: string;
  socialNetwork: string;
  projectVerificationFormId: number;
}): Promise<boolean> => {
  const { socialNetworkId, socialNetwork, projectVerificationFormId } = params;
  const socialProfilesCount = await SocialProfile.createQueryBuilder(
    'social_profile',
  )
    .where({
      socialNetworkId,
      socialNetwork,
    })
    .andWhere(`"projectVerificationFormId"=:projectVerificationFormId`, {
      projectVerificationFormId,
    })
    .getCount();
  return socialProfilesCount > 0;
};

export const findSocialProfilesByProjectVerificationId = async (
  projectVerificationFormId: number,
): Promise<SocialProfile[]> => {
  return SocialProfile.createQueryBuilder('project_verification_form')
    .where(`"projectVerificationFormId"=:projectVerificationFormId`, {
      projectVerificationFormId,
    })
    .leftJoinAndSelect('social_profile.project', 'project')
    .leftJoinAndSelect('social_profile.user', 'user')
    .leftJoinAndSelect(
      'social_profile.projectVerificationForm',
      'projectVerificationForm',
    )
    .getMany();
};

export const verifySocialProfileById = async (params: {
  socialProfileId: number;
}): Promise<SocialProfile> => {
  const { socialProfileId } = params;
  const socialProfile = await findSocialProfileById(socialProfileId);
  if (!socialProfile) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.SOCIAL_PROFILE_NOT_FOUND),
    );
  }

  socialProfile.isVerified = true;
  return socialProfile?.save();
};

export const findSocialProfilesByProjectId = async (params: {
  projectId: number;
}): Promise<SocialProfile[]> => {
  const { projectId } = params;
  return SocialProfile.createQueryBuilder()
    .where(`"projectId" = :projectId`, { projectId })
    .getMany();
};

export const removeSocialProfileById = async (params: {
  socialProfileId: number;
}): Promise<void> => {
  await SocialProfile.delete(params.socialProfileId);
};
