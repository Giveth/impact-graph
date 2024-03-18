import { Arg, Ctx, Int, Mutation, Resolver } from 'type-graphql';
import { SocialProfile } from '../entities/socialProfile';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { findProjectVerificationFormById } from '../repositories/projectVerificationRepository';
import {
  findSocialProfileById,
  removeSocialProfileById,
} from '../repositories/socialProfileRepository';
import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { setOauth2SocialProfileInRedis } from '../services/socialProfileService';

@Resolver(_of => SocialProfile)
export class SocialProfilesResolver {
  @Mutation(_returns => String)
  async addNewSocialProfile(
    @Arg('projectVerificationId', _type => Int) projectVerificationId: number,
    @Arg('socialNetwork', _type => String) socialNetwork: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<string> {
    if (!user || !user?.userId) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    }
    const projectVerificationForm = await findProjectVerificationFormById(
      projectVerificationId,
    );
    if (!projectVerificationForm) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
        ),
      );
    }
    if (projectVerificationForm.user?.id !== user.userId) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
        ),
      );
    }

    if (
      projectVerificationForm.status !== PROJECT_VERIFICATION_STATUSES.DRAFT
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES,
        ),
      );
    }

    const socialNetworkAdapter = getSocialNetworkAdapter(socialNetwork);
    const trackId = await setOauth2SocialProfileInRedis({
      socialNetwork,
      projectVerificationFormId: projectVerificationId,
      userId: user.userId,
    });
    return socialNetworkAdapter.getAuthUrl({
      trackId,
    });
  }

  @Mutation(_returns => Boolean)
  async removeSocialProfile(
    @Arg('socialProfileId', _type => Int) socialProfileId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user || !user?.userId) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    }
    const socialProfile = await findSocialProfileById(socialProfileId);
    if (!socialProfile) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.SOCIAL_PROFILE_NOT_FOUND),
      );
    }
    if (!socialProfile.projectVerificationForm) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
        ),
      );
    }
    if (socialProfile.user.id !== user.userId) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_SOCIAL_PROFILE,
        ),
      );
    }
    if (
      socialProfile.projectVerificationForm.status !==
      PROJECT_VERIFICATION_STATUSES.DRAFT
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_IS_NOT_DRAFT_SO_YOU_CANT_MODIFY_SOCIAL_PROFILES,
        ),
      );
    }
    await removeSocialProfileById({
      socialProfileId,
    });
    return true;
  }
}
