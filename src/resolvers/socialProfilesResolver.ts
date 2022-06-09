import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { SocialProfile } from '../entities/socialProfile';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';
import {
  createSocialProfile,
  findSocialProfileById,
  findSocialProfileBySocialNetworkId,
} from '../repositories/socialProfileRepository';
import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';

@Resolver(of => SocialProfile)
export class SocialProfilesResolver {
  @Mutation(returns => SocialProfile)
  async addNewSocialProfile(
    @Arg('projectVerificationId', type => Int) projectVerificationId: number,
    @Arg('socialNetwork', type => String) socialNetwork: string,
    @Arg('socialNetworkId', type => String) socialNetworkId: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<SocialProfile> {
    if (!user || !user?.userId) {
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    }
    const projectVerificationForm = await findProjectVerificationFormById(
      projectVerificationId,
    );
    if (!projectVerificationForm) {
      throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
    }
    if (projectVerificationForm.user.id !== user.id) {
      throw new Error(
        errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
      );
    }
    const savedSocialProfile = await findSocialProfileBySocialNetworkId(
      socialNetworkId,
    );
    if (
      savedSocialProfile &&
      savedSocialProfile.projectVerificationForm.id === projectVerificationId
    ) {
      throw new Error(
        errorMessages.YOU_ALREADY_ADDDED_THIS_SOCIAL_PROFILE_FOR_THIS_VERIFICATION_FORM,
      );
    }
    return createSocialProfile({
      socialNetwork,
      socialNetworkId,
      projectVerificationId,
    });
  }

  @Query(returns => String)
  async getSocialProfileOauth2Url(
    @Arg('socialProfileId', type => Int) socialProfileId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    if (!user || !user?.userId) {
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    }
    const socialProfile = await findSocialProfileById(socialProfileId);
    if (!socialProfile) {
      throw new Error(errorMessages.SOCIAL_PROFILE_NOT_FOUND);
    }
    if (socialProfile?.user.id !== user.id) {
      throw new Error(
        errorMessages.YOU_ARE_NOT_THE_OWNER_OF_THIS_SOCIAL_PROFILE,
      );
    }
    if (socialProfile?.isVerified) {
      throw new Error(errorMessages.SOCIAL_PROFILE_IS_ALREADY_VERIFIED);
    }
    const socialNetworkAdapter = getSocialNetworkAdapter(
      socialProfile.socialNetwork,
    );
    return socialNetworkAdapter.getAuthUrl({
      socialProfileId,
    });
  }
}
