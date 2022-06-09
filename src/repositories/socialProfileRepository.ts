import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PersonalInfo,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { findProjectById } from './projectRepository';
import { findUserById } from './userRepository';
import { Brackets } from 'typeorm';
import { errorMessages } from '../utils/errorMessages';
import { SocialProfile } from '../entities/socialProfile';
import { findProjectVerificationFormById } from './projectVerificationRepository';

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

export const findSocialProfileBySocialNetworkId = async (
  socialNetworkId: string,
): Promise<SocialProfile | undefined> => {
  return SocialProfile.createQueryBuilder('social_profile')
    .where({
      socialNetworkId,
    })
    .leftJoinAndSelect('social_profile.project', 'project')
    .leftJoinAndSelect('social_profile.user', 'user')
    .leftJoinAndSelect(
      'social_profile.projectVerificationForm',
      'projectVerificationForm',
    )
    .getOne();
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
}): Promise<ProjectVerificationForm> => {
  const { socialProfileId } = params;
  const socialProfile = await findSocialProfileById(socialProfileId);
  if (!socialProfile) {
    throw new Error(errorMessages.SOCIAL_PROFILE_NOT_FOUND);
  }

  socialProfile.isVerified = true;
  return projectVerificationForm?.save();
};
