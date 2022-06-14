import { Arg, Ctx, Float, Int, Mutation, Query, Resolver } from 'type-graphql';
import { SocialProfile } from '../entities/socialProfile';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';
import {
  createSocialProfile,
  findSocialProfileById,
  findSocialProfileBySocialNetworkIdAndSocialNetwork,
  isSocialNotworkAddedToVerificationForm,
} from '../repositories/socialProfileRepository';
import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { setOauth2SocialProfileInRedis } from '../services/socialProfileService';

@Resolver(of => SocialProfile)
export class SocialProfilesResolver {
  @Mutation(returns => String)
  async addNewSocialProfile(
    @Arg('projectVerificationId', type => Int) projectVerificationId: number,
    @Arg('socialNetwork', type => String) socialNetwork: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<string> {
    if (!user || !user?.userId) {
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    }
    const projectVerificationForm = await findProjectVerificationFormById(
      projectVerificationId,
    );
    if (!projectVerificationForm) {
      throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
    }
    if (projectVerificationForm.user.id !== user.userId) {
      throw new Error(
        errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
      );
    }

    if (
      projectVerificationForm.status !== PROJECT_VERIFICATION_STATUSES.DRAFT
    ) {
      throw new Error(
        errorMessages.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_ADD_SOCIAL_PROFILE_TO_IT,
      );
    }

    const trackId = await setOauth2SocialProfileInRedis({
      socialNetwork,
      projectVerificationFormId: projectVerificationId,
      userId: user.userId,
    });
    const socialNetworkAdapter = getSocialNetworkAdapter(socialNetwork);
    return socialNetworkAdapter.getAuthUrl({
      trackId,
    });
  }
}
