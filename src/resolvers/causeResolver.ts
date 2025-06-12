import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Cause, CauseStatus, ListingStatus } from '../entities/cause';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Project } from '../entities/project';
import { logger } from '../utils/logger';
import SentryLogger from '../sentryLogger';
import { findUserById } from '../repositories/userRepository';
import {
  createCause,
  validateCauseTitle,
  findCauseById,
  findAllCauses,
} from '../repositories/causeRepository';
import { verifyTransaction } from '../utils/transactionVerification';

const DEFAULT_CAUSES_LIMIT = 10;
const MAX_CAUSES_LIMIT = 100;

@Resolver()
export class CauseResolver {
  @Query(() => [Cause])
  async causes(
    @Arg('limit', {
      nullable: true,
      description: `Maximum number of causes to return. Default: ${DEFAULT_CAUSES_LIMIT}, Max: ${MAX_CAUSES_LIMIT}`,
    })
    limit?: number,
    @Arg('offset', {
      nullable: true,
      description: 'Number of causes to skip',
    })
    offset?: number,
  ): Promise<Cause[]> {
    try {
      // Apply default limit if none provided, or cap at maximum limit
      const effectiveLimit = limit
        ? Math.min(limit, MAX_CAUSES_LIMIT)
        : DEFAULT_CAUSES_LIMIT;

      const causes = await findAllCauses(effectiveLimit, offset);
      return causes;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('causes() error', {
        error: e,
        errorMessage: e.message,
        errorStack: e.stack,
        limit,
        offset,
      });
      return [];
    }
  }

  @Query(() => Cause, { nullable: true })
  async cause(@Arg('id') id: number): Promise<Cause | null> {
    try {
      const cause = await findCauseById(id);
      return cause || null;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('cause() error', { error: e, causeId: id });
      throw e;
    }
  }

  @Query(() => Boolean)
  async isValidCauseTitle(@Arg('title') title: string): Promise<boolean> {
    return validateCauseTitle(title);
  }

  @Mutation(() => Cause)
  async createCause(
    @Ctx() { req: { user: _user } }: ApolloContext,
    @Arg('title') title: string,
    @Arg('description') description: string,
    @Arg('chainId') chainId: number,
    @Arg('projectIds', () => [Number]) projectIds: number[],
    @Arg('mainCategory') mainCategory: string,
    @Arg('subCategories', () => [String]) subCategories: string[],
    @Arg('depositTxHash') depositTxHash: string,
    @Arg('depositTxChainId') depositTxChainId: number,
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
      depositTxChainId,
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

      if (!depositTxHash.trim()) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
      }

      // Get token contract address from environment
      const causeCreationFeeTokenContractAddress =
        process.env.CAUSE_CREATION_FEE_TOKEN_CONTRACT_ADDRESS;
      if (!causeCreationFeeTokenContractAddress) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.TOKEN_CONTRACT_NOT_CONFIGURED),
        );
      }

      // Verify the transaction
      await verifyTransaction(
        depositTxHash,
        depositTxChainId,
        causeCreationFeeTokenContractAddress,
      );

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
