import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import slugify from 'slugify';
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
  validateTransactionHash,
  CauseSortField,
  SortDirection,
} from '../repositories/causeRepository';
import { verifyTransaction } from '../utils/transactionVerification';
import { NETWORK_IDS } from '../provider';
import { titleWithoutSpecialCharacters } from '../utils/utils';

const DEFAULT_CAUSES_LIMIT = 20;
const MAX_CAUSES_LIMIT = 100;

const getCauseCreationFeeTokenContractAddresses = (): {
  [chainId: number]: string;
} => {
  const result = {};
  result[NETWORK_IDS.POLYGON] =
    process.env.CAUSE_CREATION_FEE_TOKEN_CONTRACT_ADDRESS_POLYGON || '';
  result[NETWORK_IDS.XDAI] =
    process.env.CAUSE_CREATION_FEE_TOKEN_CONTRACT_ADDRESS_GNOSIS || '';
  if (process.env.ENVIRONMENT === 'staging') {
    result[NETWORK_IDS.OPTIMISM_SEPOLIA] =
      process.env.CAUSE_CREATION_FEE_TOKEN_CONTRACT_ADDRESS_OPTIMISM || '';
  } else {
    result[NETWORK_IDS.OPTIMISTIC] =
      process.env.CAUSE_CREATION_FEE_TOKEN_CONTRACT_ADDRESS_OPTIMISM || '';
  }
  return result;
};

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
    @Arg('chainId', {
      nullable: true,
      description: 'Filter by chain ID',
    })
    chainId?: number,
    @Arg('searchTerm', {
      nullable: true,
      description: 'Search term to filter causes by title or description',
    })
    searchTerm?: string,
    @Arg('sortBy', {
      nullable: true,
      description: 'Field to sort by',
    })
    sortBy?: CauseSortField,
    @Arg('sortDirection', {
      nullable: true,
      description: 'Sort direction',
    })
    sortDirection?: SortDirection,
    @Arg('listingStatus', {
      nullable: true,
      description: 'Filter by listing status',
    })
    listingStatus?: ListingStatus | 'all',
  ): Promise<Cause[]> {
    try {
      // Apply default limit if none provided, or cap at maximum limit
      const effectiveLimit = limit
        ? Math.min(limit, MAX_CAUSES_LIMIT)
        : DEFAULT_CAUSES_LIMIT;

      const causes = await findAllCauses(
        effectiveLimit,
        offset,
        chainId,
        searchTerm,
        sortBy,
        sortDirection,
        listingStatus,
      );
      return causes;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('causes() error', {
        error: e,
        errorMessage: e.message,
        errorStack: e.stack,
        limit,
        offset,
        chainId,
        searchTerm,
        sortBy,
        sortDirection,
        listingStatus,
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

      // Validate transaction hash is not already used
      await validateTransactionHash(depositTxHash);

      // Get token contract addresses from environment
      const causeCreationFeeTokenContractAddresses =
        getCauseCreationFeeTokenContractAddresses();

      // Verify the transaction
      await verifyTransaction(
        depositTxHash,
        depositTxChainId,
        causeCreationFeeTokenContractAddresses,
      );

      // Generate unique causeId
      const causeId = `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const cleanTitle = titleWithoutSpecialCharacters(title.trim());
      let slug = slugify(cleanTitle, { lower: true, strict: true });
      let counter = 1;
      const unique = true;

      while (unique) {
        const existingSlug = await Cause.createQueryBuilder('cause')
          .where('lower(slug) = lower(:slug)', { slug })
          .getOne();

        if (!existingSlug) {
          break; // Slug is unique
        }

        slug = `${slug}-${counter}`;
        counter++;
      }

      // Create funding pool address (this should be replaced with actual implementation)
      const fundingPoolAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

      const causeData = {
        title: title.trim(),
        description: description.trim(),
        chainId,
        slug,
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
        depositTxHash: depositTxHash.trim().toLowerCase(),
        depositTxChainId,
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
