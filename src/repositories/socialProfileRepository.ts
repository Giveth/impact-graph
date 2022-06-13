import { ProjectVerificationForm } from '../entities/projectVerificationForm';
import { errorMessages } from '../utils/errorMessages';
import { SocialProfile } from '../entities/socialProfile';
import { findProjectVerificationFormById } from './projectVerificationRepository';
// TODO should write test cases for all of these functions

export const createSocialProfile = async (params: {
  projectVerificationId: number;
  socialNetwork: string;
  socialNetworkId: string;
}): Promise<SocialProfile> => {
  const { projectVerificationId, socialNetworkId, socialNetwork } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  return SocialProfile.create({
    project: projectVerificationForm?.project,
    user: projectVerificationForm?.user,
    projectVerificationForm,
    socialNetwork,
    socialNetworkId,
  }).save();
};

export const findSocialProfileById = async (
  socialProfileId: number,
): Promise<SocialProfile | undefined> => {
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
  }): Promise<SocialProfile | undefined> => {
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

export const isSocialNotworkAddedToVerificationForm = async (params: {
  socialNetworkId: string;
  socialNetwork: string;
  projectVerificationFormId: number;
}): Promise<Boolean> => {
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
    throw new Error(errorMessages.SOCIAL_PROFILE_NOT_FOUND);
  }

  socialProfile.isVerified = true;
  return socialProfile?.save();
};
