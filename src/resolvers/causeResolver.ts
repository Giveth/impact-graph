import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import slugify from 'slugify';
import { convert } from 'html-to-text';
import {
  Cause,
  ReviewStatus,
  ProjStatus,
  CauseProject,
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
import {
  creteSlugFromProject,
  titleWithoutSpecialCharacters,
} from '../utils/utils';
import { Category } from '../entities/category';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { ProjectStatus } from '../entities/projectStatus';
import { AgentDistributionService } from '../services/agentDistributionService';
import {
  addBulkNewProjectAddress,
  findProjectRecipientAddressByProjectId,
  removeRecipientAddressOfProject,
} from '../repositories/projectAddressRepository';
import { getAppropriateNetworkId } from '../services/chains';
import { User } from '../entities/user';
import {
  getAppropriateSlug,
  getQualityScore,
} from '../services/projectService';
import {
  validateProjectRelatedAddresses,
  validateProjectTitleForEdit,
} from '../utils/validators/projectValidator';
import { Reaction } from '../entities/reaction';
import { UpdateProjectInput } from './types/project-input';
import { Token } from '../entities/token';
import { sortTokensByOrderAndAlphabets } from '../utils/tokenUtils';

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
      if (cause) {
        cause.causeProjects = await cause.loadCauseProjects();
      }
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
        where: { slug, projectType: 'cause' },
      });
      if (!causeFindId) {
        return null;
      }
      const cause = await findCauseById(causeFindId.id);
      if (cause) {
        cause.causeProjects = await cause.loadCauseProjects();
      }
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

  @Mutation(_returns => Cause)
  async updateCause(
    @Arg('projectId') projectId: number,
    @Arg('newProjectData') newProjectData: UpdateProjectInput,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const dbUser = await findUserById(user.userId);

    // Check if user email is verified
    if (!dbUser || !dbUser.isEmailVerified) {
      throw new Error(i18n.__(translationErrorMessagesKeys.EMAIL_NOT_VERIFIED));
    }

    const { bannerImage } = newProjectData;

    // const project = await Project.findOne({ id: projectId });
    const project = await findCauseById(projectId);

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));

    logger.debug(`project.adminUserId ---> : ${project.adminUserId}`);
    logger.debug(`user.userId ---> : ${user.userId}`);
    logger.debug(`updateProject, inputData :`, newProjectData);
    if (project.adminUserId !== user.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    for (const field in newProjectData) {
      if (field === 'addresses' || field === 'socialMedia') {
        // We will take care of addresses and relations manually
        continue;
      }
      project[field] = newProjectData[field];
    }

    if (newProjectData.categories) {
      const categoriesPromise = newProjectData.categories.map(
        async category => {
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
        },
      );

      const categories = await Promise.all(categoriesPromise);
      if (categories.length > 5) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
          ),
        );
      }
      project.categories = categories;
    }

    const heartCount = await Reaction.count({ where: { projectId } });

    if (!bannerImage) {
      const qualityScore = getQualityScore(
        project.description,
        Boolean(bannerImage),
        heartCount,
      );
      project.qualityScore = qualityScore;
    }
    if (newProjectData.title) {
      await validateProjectTitleForEdit(newProjectData.title, projectId);
    }

    if (newProjectData.addresses) {
      await validateProjectRelatedAddresses(
        newProjectData.addresses,
        projectId,
      );
    }
    const slugBase = creteSlugFromProject(newProjectData.title);
    if (!slugBase) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_TITLE),
      );
    }
    const newSlug = await getAppropriateSlug(slugBase, projectId);
    if (project.slug !== newSlug && !project.slugHistory?.includes(newSlug)) {
      // it's just needed for editProject, we dont add current slug in slugHistory so it's not needed to do this in addProject
      project.slugHistory?.push(project.slug as string);
    }
    if (bannerImage !== undefined) {
      project.image = bannerImage;
    }

    // Find and validate projects
    const { projectIds } = newProjectData;
    const projects = await Project.findByIds(projectIds as any[]);
    if (projects.length !== (projectIds as any[]).length) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_IDS),
      );
    }

    // Get existing cause-project relationships
    const existingCauseProjects = await CauseProject.find({
      where: { causeId: project.id },
    });

    // Create a map of existing project IDs for quick lookup
    const newProjectIds = new Set(projectIds);

    // Set isIncluded to false for projects that are no longer in the array
    for (const existingCauseProject of existingCauseProjects) {
      if (!newProjectIds.has(existingCauseProject.projectId)) {
        existingCauseProject.isIncluded = false;
        await existingCauseProject.save();
      }
    }

    const causeProjects: CauseProject[] = [];
    // Create or update cause-project relationships
    for (const subProject of projects) {
      let causeProject = existingCauseProjects.find(
        cp => cp.projectId === subProject.id,
      );

      if (causeProject) {
        // Update existing relationship
        causeProject.isIncluded = true;
        await causeProject.save();
        causeProjects.push(causeProject);
      } else {
        // Create new relationship
        causeProject = await CauseProject.create({
          causeId: project.id,
          projectId: subProject.id,
          amountReceived: 0,
          amountReceivedUsdValue: 0,
          causeScore: 0,
          isIncluded: true,
        }).save();
        causeProjects.push(causeProject);
      }
    }
    project.activeProjectsCount = projects.length;
    project.slug = newSlug;
    project.activeProjectsCount = projects.length;
    project.updatedAt = new Date();
    project.listed = null;
    project.reviewStatus = ReviewStatus.NotReviewed;
    project.title = convert(newProjectData.title);

    await project.save();
    await project.reload();

    const adminUser = (await findUserById(project.adminUserId)) as User;
    if (newProjectData.addresses) {
      await removeRecipientAddressOfProject({ project });
      await addBulkNewProjectAddress(
        newProjectData?.addresses.map(relatedAddress => {
          return {
            project,
            user: adminUser,
            address: relatedAddress.address,
            chainType: relatedAddress.chainType,
            memo: relatedAddress.memo,

            // Frontend doesn't send networkId for solana addresses so we set it to default solana chain id
            networkId: getAppropriateNetworkId({
              networkId: relatedAddress.networkId,
              chainType: relatedAddress.chainType,
            }),

            isRecipient: true,
          };
        }),
      );
    }

    project.adminUser = adminUser;
    project.addresses = await findProjectRecipientAddressByProjectId({
      projectId,
    });
    project.causeProjects = await project.loadCauseProjects();

    // Edit emails
    // await getNotificationAdapter().projectEdited({ project });

    return project;
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
    @Arg('bannerImage', { nullable: true }) bannerImage?: string,
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
            projectType: 'cause',
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
          id: ProjStatus.active,
        },
      });

      const causeData = {
        title: convert(title.trim()),
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
        isGivbackEligible: true,
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
        image: bannerImage,
        latestUpdateCreationDate: now,
        isDraft: false,
        projectType: 'cause',
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

  @Query(_returns => [Token])
  async getCauseAcceptTokens(
    @Arg('causeId') causeId: number,
    @Arg('networkId') networkId: number,
  ): Promise<Token[]> {
    try {
      const organization = await Organization.createQueryBuilder('organization')
        .innerJoin(
          'organization.projects',
          'project',
          'project.id = :causeId',
          { causeId },
        )
        .leftJoinAndSelect('organization.tokens', 'tokens')
        .andWhere('tokens.networkId = :networkId', { networkId })
        .getOne();

      if (!organization) {
        return [];
      }
      return sortTokensByOrderAndAlphabets(organization.tokens);
    } catch (e) {
      logger.error('getCauseAcceptTokens error', e);
      throw e;
    }
  }
}
