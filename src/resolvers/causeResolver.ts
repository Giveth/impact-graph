import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import slugify from 'slugify';
import {
  Cause,
  ReviewStatus,
  ProjStatus,
  ProjectType,
} from '../entities/project';
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
import { Category } from '../entities/category';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { ProjectStatus } from '../entities/projectStatus';
import { AgentDistributionService } from '../services/agentDistributionService';

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

@Resolver(_of => Cause)
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
    listingStatus?: ReviewStatus | 'all',
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

  @Query(() => Cause, { nullable: true })
  async causeBySlug(@Arg('slug') slug: string): Promise<Cause | null> {
    try {
      const causeFindId = await Cause.findOne({
        where: { slug, projectType: ProjectType.CAUSE },
      });
      if (!causeFindId) {
        return null;
      }
      const cause = await findCauseById(causeFindId.id);
      return cause || null;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('causeBySlug() error', { error: e, causeSlug: slug });
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
      if (!title?.trim() || !description?.trim() || !chainId) {
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

      const cleanTitle = titleWithoutSpecialCharacters(title.trim());
      let slug = slugify(cleanTitle, { lower: true, strict: true });
      let counter = 1;
      const unique = true;

      while (unique) {
        const existingSlug = await Cause.createQueryBuilder('cause')
          .where('lower(slug) = lower(:slug)', { slug })
          .andWhere('cause.projectType = :projectType', {
            projectType: ProjectType.CAUSE,
          })
          .getOne();

        if (!existingSlug) {
          break; // Slug is unique
        }

        slug = `${slug}-${counter}`;
        counter++;
      }

      // Generate funding pool address via API
      const walletData = await AgentDistributionService.generateWallet();
      if (!walletData?.address || !walletData?.hdPath) {
        throw new Error(
          'Wallet generation service returned an invalid payload',
        );
      }
      const fundingPoolAddress = walletData.address;
      const fundingPoolHdPath = walletData.hdPath;

      // We do not create categories only use existing ones
      const categories = await Promise.all(
        subCategories
          ? subCategories.map(async category => {
              const [c] = await Category.find({
                where: {
                  name: category,
                  isActive: true,
                  canUseOnFrontend: true,
                },
              });
              if (!c) {
                throw new Error(
                  i18n.__(
                    translationErrorMessagesKeys.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
                  ),
                );
              }
              return c;
            })
          : [],
      );

      if (categories.length > 5) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
          ),
        );
      }

      const organization = await Organization.findOne({
        where: {
          label: ORGANIZATION_LABELS.GIVETH,
        },
      });
      const now = new Date();

      const status = await ProjectStatus.findOne({
        where: {
          id: ProjStatus.pending,
        },
      });

      const causeData = {
        title: title.trim(),
        description: description.trim(),
        chainId,
        slug,
        slugHistory: [],
        organization,
        fundingPoolAddress,
        fundingPoolHdPath,
        categories,
        status: status as ProjectStatus,
        statusId: status?.id,
        reviewStatus: ReviewStatus.NotReviewed,
        totalRaised: 0,
        verified: true,
        giveBacks: true,
        qualityScore: 0,
        totalDonations: 0,
        adminUserId: user.id,
        adminUser: user,
        totalReactions: 0,
        totalProjectUpdates: 1,
        totalDistributed: 0,
        totalDonated: 0,
        activeProjectsCount: projects.length,
        depositTxHash: depositTxHash.trim().toLowerCase(),
        depositTxChainId,
        creationDate: now,
        updatedAt: now,
        latestUpdateCreationDate: now,
        isDraft: false,
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
