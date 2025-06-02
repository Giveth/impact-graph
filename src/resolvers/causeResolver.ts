import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { Cause, CauseStatus, ListingStatus } from '../entities/cause';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Project } from '../entities/project';
import { logger } from '../utils/logger';
import SentryLogger from '../sentryLogger';
import { findUserById } from '../repositories/userRepository';
import { createCause } from '../repositories/causeRepository';

@Resolver()
export class CauseResolver {
  @Mutation(() => Cause)
  async createCause(
    @Ctx() { req: { user: _user } }: ApolloContext,
    @Arg('title') title: string,
    @Arg('description') description: string,
    @Arg('chainId') chainId: number,
    @Arg('projectIds', () => [Number]) projectIds: number[],
    @Arg('mainCategory') mainCategory: string,
    @Arg('subCategories', () => [String]) subCategories: string[],
    @Arg('depositTxHash', { nullable: true }) depositTxHash?: string,
    @Arg('bannerImage', { nullable: true }) _bannerImage?: string,
  ): Promise<Cause> {
    const logData = {
      title,
      description,
      chainId,
      projectIds,
      mainCategory,
      subCategories,
      depositTxHash,
      userId: _user?.userId,
    };
    logger.debug(
      'createCause() resolver has been called with this data',
      logData,
    );

    try {
      const userId = _user?.userId;
      const user = await findUserById(userId);
      if (!user) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      // Validate required fields
      if (
        !title?.trim() ||
        !description?.trim() ||
        !chainId ||
        !mainCategory?.trim()
      ) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_INPUT));
      }

      // Validate chainId is a polygon chain id
      if (typeof chainId !== 'number' || isNaN(chainId) || chainId !== 137) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_CHAIN_ID));
      }

      // Validate project IDs
      if (!projectIds || projectIds.length < 5 || projectIds.length > 50) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_COUNT),
        );
      }

      // Find and validate projects
      const projects = await Project.findByIds(projectIds);
      if (projects.length !== projectIds.length) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_IDS),
        );
      }

      // Verify deposit transaction if provided
      if (depositTxHash) {
        // TODO: Implement deposit transaction verification
        // This should verify the transaction exists and is valid
        // For now, we'll just check if it's a non-empty string
        if (!depositTxHash.trim()) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH),
          );
        }
      }

      // Generate unique causeId
      const causeId = `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create funding pool address (this should be replaced with actual implementation)
      const fundingPoolAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

      const causeData = {
        title: title.trim(),
        description: description.trim(),
        chainId,
        fundingPoolAddress,
        causeId,
        mainCategory: mainCategory.trim(),
        subCategories: subCategories.map(cat => cat.trim()),
        status: CauseStatus.PENDING,
        listingStatus: ListingStatus.NotReviewed,
        totalRaised: 0,
        totalDistributed: 0,
        totalDonated: 0,
        activeProjectsCount: projects.length,
      };

      const cause = await createCause(causeData, user, projects);

      logger.debug('Cause created successfully', { causeId: cause.id });
      return cause;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('createCause() error', {
        error: e,
        inputData: logData,
      });
      throw e;
    }
  }
}
