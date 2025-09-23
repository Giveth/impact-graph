import { Max, Min } from 'class-validator';
import { Brackets, getMetadataArgsStorage, Repository } from 'typeorm';
import { Service } from 'typedi';
import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  Float,
  ID,
  Info,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import graphqlFields from 'graphql-fields';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';
import { GraphQLResolveInfo } from 'graphql/type';
import { convert } from 'html-to-text';
import { Reaction } from '../entities/reaction';
import {
  Cause,
  CauseProject,
  FilterField,
  OrderField,
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
  SortingField,
} from '../entities/project';
import { ProjectStatus } from '../entities/projectStatus';
import {
  CreateProjectInput,
  ImageUpload,
  UpdateProjectInput,
} from './types/project-input';
import { pinFile } from '../middleware/pinataUtils';
import { Category } from '../entities/category';
import { Donation } from '../entities/donation';
import { ProjectImage } from '../entities/projectImage';
import { ApolloContext } from '../types/ApolloContext';
import { publicSelectionFields, User } from '../entities/user';
import { Context } from '../context';
import SentryLogger from '../sentryLogger';
import { ProjectAddress } from '../entities/projectAddress';
import { QfRound } from '../entities/qfRound';
import { ProjectInstantPowerView } from '../views/projectInstantPowerView';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import {
  canUserVisitProject,
  validateProjectRelatedAddresses,
  validateProjectTitle,
  validateProjectTitleForEdit,
  validateProjectWalletAddress,
} from '../utils/validators/projectValidator';
import { updateProjectUpdatesStatistics } from '../services/projectUpdatesService';
import { logger } from '../utils/logger';
import { getLoggedInUser } from '../services/authorizationServices';
import {
  getAppropriateSlug,
  getQualityScore,
} from '../services/projectService';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { Token } from '../entities/token';
import { findUserById } from '../repositories/userRepository';
import {
  addBulkNewProjectAddress,
  addNewProjectAddress,
  findProjectRecipientAddressByProjectId,
  getPurpleListAddresses,
  isWalletAddressInPurpleList,
  removeRecipientAddressOfProject,
} from '../repositories/projectAddressRepository';
import { RelatedAddressInputType } from './types/ProjectVerificationUpdateInput';
import {
  FilterProjectQueryInputParams,
  filterProjectsQuery,
  filterProjectsQueryOptimized,
  findProjectById,
  findProjectIdBySlug,
  findQfRoundProjects,
  removeProjectAndRelatedEntities,
  totalProjectsPerDate,
  totalProjectsPerDateByMonthAndYear,
} from '../repositories/projectRepository';
import { sortTokensByOrderAndAlphabets } from '../utils/tokenUtils';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { NETWORK_IDS } from '../provider';
import { getVerificationFormStatusByProjectId } from '../repositories/projectVerificationRepository';
import {
  resourcePerDateReportValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../repositories/projectPowerViewRepository';
import { ResourcePerDateRange } from './donationResolver';
import { findUserReactionsByProjectIds } from '../repositories/reactionRepository';
import { AppDataSource } from '../orm';
import { creteSlugFromProject, isSocialMediaEqual } from '../utils/utils';
import { findCampaignBySlug } from '../repositories/campaignRepository';
import { Campaign } from '../entities/campaign';
import { FeaturedUpdate } from '../entities/featuredUpdate';
import { PROJECT_UPDATE_CONTENT_MAX_LENGTH } from '../constants/validators';
import { calculateGivbackFactor } from '../services/givbackService';
import { ProjectBySlugResponse } from './types/projectResolver';
import { ChainType } from '../types/network';
import {
  findActiveQfRound,
  getQfRoundStats,
} from '../repositories/qfRoundRepository';
import { getAllProjectsRelatedToActiveCampaigns } from '../services/campaignService';
import { getAppropriateNetworkId } from '../services/chains';
import {
  addBulkProjectSocialMedia,
  removeProjectSocialMedia,
} from '../repositories/projectSocialMediaRepository';
// import { loadCauseProjects } from '../repositories/causeRepository';

const projectUpdatsCacheDuration = 1000 * 60 * 60;

const projectFiltersCacheDuration = Number(
  process.env.PROJECT_FILTERS_THREADS_POOL_DURATION || 60000,
);

@ObjectType()
class AllProjects {
  @Field(_type => [Project])
  projects: Project[] | Cause[];

  @Field(_type => Int)
  totalCount: number;

  @Field(_type => [Category], { nullable: true })
  categories: Category[];

  @Field(_type => Campaign, { nullable: true })
  campaign?: Campaign;
}

@ObjectType()
class TopProjects {
  @Field(_type => [Project])
  projects: Project[];

  @Field(_type => Int)
  totalCount: number;
}

@ObjectType()
class ProjectUpdatesResponse {
  @Field(_type => [ProjectUpdate])
  projectUpdates: ProjectUpdate[];
}

@ObjectType()
class QfRoundStats {
  @Field(_type => Int)
  roundId: number;

  @Field(_type => Float)
  totalRaisedInRound: number;

  @Field(_type => Int)
  totalDonorsInRound: number;
}

@ObjectType()
class QfProject {
  @Field(_type => ID)
  id: number;

  @Field()
  title: string;

  @Field({ nullable: true })
  descriptionSummary?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  image?: string;

  @Field(_type => Float)
  totalRaisedUsd: number;

  @Field()
  verified: boolean;

  @Field()
  isGivbacksEligible: boolean;

  @Field({ nullable: true })
  slug?: string;

  @Field(_type => User, { nullable: true })
  admin: User;

  @Field(_type => ProjectStatus)
  status: ProjectStatus;

  @Field()
  reviewStatus: string;

  @Field()
  projectType: string;

  @Field(_type => ProjectInstantPowerView, { nullable: true })
  projectInstantPower?: ProjectInstantPowerView;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  creationDate?: Date;

  @Field({ nullable: true })
  latestUpdateCreationDate?: Date;

  @Field(_type => Organization, { nullable: true })
  organization?: Organization;

  @Field(_type => Int, { nullable: true })
  activeProjectsCount?: number;

  @Field(_type => [ProjectAddress], { nullable: true })
  addresses?: ProjectAddress[];

  @Field(_type => [QfRound], { nullable: true })
  qfRounds?: QfRound[];

  @Field(_type => QfRoundStats, { nullable: true })
  qfRoundStats?: QfRoundStats;
}

@ObjectType()
class QfProjectsResponse {
  @Field(_type => [QfProject])
  projects: QfProject[];

  @Field(_type => Int)
  totalCount: number;
}

export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortingField, {
  name: 'SortingField',
  description: 'Sort by type',
});

registerEnumType(FilterField, {
  name: 'FilterField',
  description: 'Filter by field',
});

registerEnumType(OrderField, {
  name: 'OrderField',
  description: 'Order by field',
});

registerEnumType(OrderDirection, {
  name: 'OrderDirection',
  description: 'Order direction',
});

registerEnumType(ChainType, {
  name: 'ChainType',
  description: 'Chain type (EVM or SOLANA)',
});

@InputType()
export class OrderBy {
  @Field(_type => OrderField)
  field: OrderField;

  @Field(_type => OrderDirection)
  direction: OrderDirection;
}

@InputType()
export class FilterBy {
  @Field(_type => FilterField, { nullable: true })
  field: FilterField;

  @Field(_type => Boolean, { nullable: true })
  value: boolean;
}

@Service()
@ArgsType()
class GetProjectsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(_type => OrderBy, {
    defaultValue: {
      field: OrderField.GIVPower,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: OrderBy;

  @Field(_type => String, { nullable: true })
  searchTerm: string;

  @Field({ nullable: true })
  category: string;

  @Field({ nullable: true })
  mainCategory: string;

  @Field(_type => FilterBy, {
    nullable: true,
    defaultValue: { field: null, value: null },
  })
  filterBy: FilterBy;

  @Field(_type => [FilterField], {
    nullable: true,
    defaultValue: [],
  })
  filters: FilterField[];

  @Field(_type => String, {
    nullable: true,
  })
  campaignSlug: string;

  @Field(_type => SortingField, {
    nullable: true,
    defaultValue: SortingField.QualityScore,
  })
  sortingBy: SortingField;

  @Field({ nullable: true })
  admin?: number;

  @Field(_type => Int, { nullable: true })
  connectedWalletUserId?: number;

  @Field(_type => Int, { nullable: true })
  qfRoundId?: number;

  @Field(_type => String, { nullable: true })
  qfRoundSlug?: string;

  @Field({ nullable: true })
  includeUnlisted?: boolean;

  @Field(_type => String, { nullable: true, defaultValue: 'project' })
  projectType?: string;
}

@Service()
@ArgsType()
class GetOptimizedProjectsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(_type => OrderBy, {
    defaultValue: {
      field: OrderField.GIVPower,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: OrderBy;

  @Field(_type => String, { nullable: true })
  searchTerm: string;

  @Field({ nullable: true })
  category: string;

  @Field({ nullable: true })
  mainCategory: string;

  @Field(_type => FilterBy, {
    nullable: true,
    defaultValue: { field: null, value: null },
  })
  filterBy: FilterBy;

  @Field(_type => [FilterField], {
    nullable: true,
    defaultValue: [],
  })
  filters: FilterField[];

  @Field(_type => String, {
    nullable: true,
  })
  campaignSlug: string;

  @Field(_type => SortingField, {
    nullable: true,
    defaultValue: SortingField.InstantBoosting,
  })
  sortingBy: SortingField;

  @Field({ nullable: true })
  admin?: number;

  @Field(_type => Int, { nullable: true })
  connectedWalletUserId?: number;

  @Field({ nullable: true })
  includeUnlisted?: boolean;

  @Field(_type => String, { nullable: true, defaultValue: 'project' })
  projectType?: string;
}

@Service()
@ArgsType()
class QfProjectsArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(_type => String, { nullable: true })
  searchTerm: string;

  @Field(_type => [FilterField], {
    nullable: true,
    defaultValue: [],
  })
  filters: FilterField[];

  @Field(_type => SortingField, {
    nullable: true,
    defaultValue: SortingField.QualityScore,
  })
  sortingBy: SortingField;
}

@ObjectType()
class ImageResponse {
  @Field(_type => String)
  url: string;

  @Field(_type => Number, { nullable: true })
  projectId?: number;

  @Field(_type => Number)
  projectImageId: number;
}

@Resolver(_of => Project)
export class ProjectResolver {
  static addCategoryQuery(
    query: SelectQueryBuilder<Project>,
    category?: string,
  ) {
    if (!category) return query;

    return query.innerJoin(
      'project.categories',
      'category',
      'category.name = :category',
      { category },
    );
  }

  static addMainCategoryQuery(
    query: SelectQueryBuilder<Project>,
    mainCategory?: string,
  ) {
    if (!mainCategory) return query;

    query = query
      .leftJoin('project.categories', 'categoryForMainCategorySearch')
      .innerJoin(
        'categoryForMainCategorySearch.mainCategory',
        'filteredMainCategory',
        'filteredMainCategory.slug = :mainCategory',
        { mainCategory },
      );
    return query;
  }

  static addSearchQuery(
    query: SelectQueryBuilder<Project>,
    searchTerm?: string,
  ) {
    if (!searchTerm) return query;

    return (
      query
        // For future use! This is the way to use similarity in TypeORM
        // .addSelect('similarity(project.title, :searchTerm)', 'title_slm')
        // .addSelect('similarity(project.description, :searchTerm)', 'desc_slm')
        // .addSelect('similarity(project.impactLocation, :searchTerm)', 'loc_slm')
        // .setParameter('searchTerm', searchTerm)
        .addSelect(
          `(CASE 
            WHEN project.title %> :searchTerm THEN 1
            ELSE 2
          END)`,
          'title_priority',
        )
        .andWhere(
          new Brackets(qb => {
            qb.where('project.title %> :searchTerm', { searchTerm })
              .orWhere('project.description %> :searchTerm', { searchTerm })
              .orWhere('project.impactLocation %> :searchTerm', { searchTerm });
          }),
        )
        .orderBy('title_priority', 'ASC')
        .setParameter('searchTerm', searchTerm)
    );
  }

  static addReactionToProjectsQuery(
    query: SelectQueryBuilder<Project>,
    userId: number,
  ) {
    return query.leftJoinAndMapOne(
      'project.reaction',
      Reaction,
      'reaction',
      `reaction.projectId = project.id AND reaction.userId = :userId`,
      { userId },
    );
  }

  static addReactionToProjectsUpdateQuery(
    query: SelectQueryBuilder<ProjectUpdate>,
    userId: number,
  ) {
    return query.leftJoinAndMapOne(
      'projectUpdate.reaction',
      Reaction,
      'reaction',
      'reaction.projectUpdateId = projectUpdate.id AND reaction.userId = :userId',
      { userId },
    );
  }

  static similarProjectsBaseQuery(
    userId?: number,
    currentProject?: Project | null,
  ): SelectQueryBuilder<Project> {
    const query = Project.createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .innerJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoinAndSelect('project.qfRounds', 'qfRounds')
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields)
      .where('project.id != :id', { id: currentProject?.id })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      );

    // if loggedIn get his reactions
    if (userId) this.addReactionToProjectsQuery(query, userId);

    return query;
  }

  static async matchExactProjectCategories(
    allProjects: AllProjects,
    query: SelectQueryBuilder<Project>,
    categoriesIds: number[] | undefined,
    take: number,
    skip: number,
  ): Promise<AllProjects> {
    if (categoriesIds) {
      query.andWhere(
        new Brackets(innerQuery => {
          innerQuery.where(
            // Get Projects with the exact same categories
            new Brackets(subQuery => {
              for (const categoryId of categoriesIds) {
                subQuery.where(
                  `project.id IN (
                  SELECT "projectId"
                  FROM project_categories_category
                  WHERE "categoryId" = :category
                )`,
                  { category: categoryId },
                );
              }
            }),
          );
        }),
      );
    }

    const [projects, totalCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    allProjects.projects = projects;
    allProjects.totalCount = totalCount;

    return allProjects;
  }

  static async matchAnyProjectCategory(
    allProjects: AllProjects,
    query: SelectQueryBuilder<Project>,
    categoriesIds: number[] | undefined,
    take: number,
    skip: number,
  ): Promise<AllProjects> {
    if (categoriesIds) {
      query.andWhere('categories.id IN (:...ids)', { ids: categoriesIds });
    }
    const [projects, totalCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    allProjects.projects = projects;
    allProjects.totalCount = totalCount;

    return allProjects;
  }

  static async matchOwnerProjects(
    allProjects: AllProjects,
    query: SelectQueryBuilder<Project>,
    take: number,
    skip: number,
    ownerId?: number | null,
  ): Promise<AllProjects> {
    query.andWhere('project.adminUserId = :ownerId', { ownerId });
    const [projects, totalCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    allProjects.projects = projects;
    allProjects.totalCount = totalCount;

    return allProjects;
  }

  static addFiltersQuery(
    query: SelectQueryBuilder<Project>,
    filtersArray: FilterField[] = [],
  ) {
    if (!filtersArray || filtersArray.length === 0) return query;
    const networkIds: number[] = [];
    let acceptFundOnSolanaSeen = false;
    let acceptFundOnStellarSeen = false;

    filtersArray.forEach(filter => {
      switch (filter) {
        case FilterField.AcceptGiv:
          // only giving Blocks do not accept Giv
          return query.andWhere(`project.${filter} IS NULL`);
        case FilterField.Verified:
          return query.andWhere('project.verified = :verified', {
            verified: true,
          });
        case FilterField.IsGivbackEligible:
          return query.andWhere(
            'project.isGivbackEligible = :isGivbackEligible',
            {
              isGivbackEligible: true,
            },
          );
        case FilterField.Endaoment:
          return query.andWhere('organization.label = :label', {
            label: ORGANIZATION_LABELS.ENDAOMENT,
          });
        case FilterField.BoostedWithGivPower:
          return query.andWhere(`projectPower.totalPower > 0`);
        case FilterField.ActiveQfRound:
          return query.andWhere(
            `EXISTS (
                        SELECT 1
                        FROM project_qf_rounds_qf_round
                        INNER JOIN qf_round on qf_round.id = project_qf_rounds_qf_round."qfRoundId"
                        WHERE project_qf_rounds_qf_round."projectId" = project.id AND qf_round."isActive" = true
                )`,
          );
        case FilterField.AcceptFundOnGnosis:
          networkIds.push(NETWORK_IDS.XDAI);
          return;
        case FilterField.AcceptFundOnMainnet:
          networkIds.push(NETWORK_IDS.MAIN_NET);

          // Add this to make sure works on Staging
          networkIds.push(NETWORK_IDS.SEPOLIA);
          return;
        case FilterField.AcceptFundOnCelo:
          networkIds.push(NETWORK_IDS.CELO);

          // Add this to make sure works on Staging
          networkIds.push(NETWORK_IDS.CELO_ALFAJORES);
          return;

        case FilterField.AcceptFundOnArbitrum:
          networkIds.push(NETWORK_IDS.ARBITRUM_MAINNET);
          networkIds.push(NETWORK_IDS.ARBITRUM_SEPOLIA);
          return;

        case FilterField.AcceptFundOnBase:
          networkIds.push(NETWORK_IDS.BASE_MAINNET);
          networkIds.push(NETWORK_IDS.BASE_SEPOLIA);
          return;

        case FilterField.AcceptFundOnZKEVM:
          networkIds.push(NETWORK_IDS.ZKEVM_MAINNET);
          networkIds.push(NETWORK_IDS.ZKEVM_CARDONA);
          return;

        case FilterField.AcceptFundOnPolygon:
          networkIds.push(NETWORK_IDS.POLYGON);
          return;
        case FilterField.AcceptFundOnOptimism:
          networkIds.push(NETWORK_IDS.OPTIMISTIC);

          // Add this to make sure works on Staging
          networkIds.push(NETWORK_IDS.OPTIMISM_SEPOLIA);
          return;
        case FilterField.AcceptFundOnETC:
          networkIds.push(NETWORK_IDS.ETC);

          // Add this to make sure works on Staging
          networkIds.push(NETWORK_IDS.MORDOR_ETC_TESTNET);
          return;
        case FilterField.AcceptFundOnStellar:
          acceptFundOnStellarSeen = true;
          return;
        case FilterField.AcceptFundOnSolana:
          acceptFundOnSolanaSeen = true;
          return;

        default:
          return query.andWhere(`project.${filter} = true`);
      }
    });

    if (
      networkIds.length > 0 ||
      acceptFundOnSolanaSeen ||
      acceptFundOnStellarSeen
    ) {
      // TODO: This logic seems wrong! since only one of the following filters can be true at the same time
      query.andWhere(
        new Brackets(subQuery => {
          if (networkIds.length > 0) {
            subQuery.orWhere(
              `EXISTS (
                        SELECT *
                        FROM project_address
                        WHERE "isRecipient" = true AND 
                        "projectId" = project.id AND
                        "networkId" IN (${networkIds.join(', ')}) 
                      )`,
            );
          }
          if (acceptFundOnSolanaSeen) {
            subQuery.orWhere(
              `EXISTS (
                        SELECT *
                        FROM project_address
                        WHERE "isRecipient" = true AND 
                        "projectId" = project.id AND
                        "chainType" = '${ChainType.SOLANA}'
                      )`,
            );
          }
          if (acceptFundOnStellarSeen) {
            subQuery.orWhere(
              `EXISTS (
                        SELECT *
                        FROM project_address
                        WHERE "isRecipient" = true AND 
                        "projectId" = project.id AND
                        "chainType" = '${ChainType.STELLAR}'
                      )`,
            );
          }
        }),
      );
    }
    return query;
  }

  static addUserReaction<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    connectedWalletUserId?: number,
    authenticatedUser?: any,
  ): SelectQueryBuilder<T> {
    const userId = connectedWalletUserId || authenticatedUser?.userId;
    if (userId) {
      return query.leftJoinAndMapOne(
        'project.reaction',
        Reaction,
        'reaction',
        'reaction.projectId = CAST(project.id AS INTEGER) AND reaction.userId = :viewerUserId',
        { viewerUserId: userId },
      );
    }

    return query;
  }

  private static addProjectVerificationForm<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    connectedWalletUserId?: number,
    authenticatedUser?: any,
  ): SelectQueryBuilder<T> {
    const userId = connectedWalletUserId || authenticatedUser?.userId;
    if (userId) {
      return query.leftJoinAndSelect(
        'project.projectVerificationForm',
        'projectVerificationForm',
      );
    }

    return query;
  }

  constructor(
    private readonly projectRepository: Repository<Project>,
    private readonly projectUpdateRepository: Repository<ProjectUpdate>,
    private readonly projectStatusRepository: Repository<ProjectStatus>,
    private readonly categoryRepository: Repository<Category>,
    private readonly userRepository: Repository<User>,
    private readonly donationRepository: Repository<Donation>,
    private readonly projectImageRepository: Repository<ProjectImage>,
  ) {
    const ds = AppDataSource.getDataSource();
    this.projectRepository = ds.getRepository(Project);
    this.projectUpdateRepository = ds.getRepository(ProjectUpdate);
    this.projectStatusRepository = ds.getRepository(ProjectStatus);
    this.projectStatusRepository = ds.getRepository(ProjectStatus);
    this.categoryRepository = ds.getRepository(Category);
    this.userRepository = ds.getRepository(User);
    this.donationRepository = ds.getRepository(Donation);
    this.projectImageRepository = ds.getRepository(ProjectImage);
  }

  @Query(_returns => TopProjects)
  async featuredProjects(
    @Args()
    { limit, skip, connectedWalletUserId }: GetProjectsArgs,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<TopProjects> {
    const query = Project.createQueryBuilder('project')
      .where(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .innerJoinAndSelect('project.featuredUpdate', 'featuredUpdate')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoinAndSelect('project.projectPower', 'projectPower')
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields)
      .orderBy('featuredUpdate.position', 'ASC', 'NULLS LAST');

    // if loggedIn get his reactions
    const viewerUserId = connectedWalletUserId || user?.userId;
    if (viewerUserId)
      ProjectResolver.addReactionToProjectsQuery(query, viewerUserId);

    const [featuredProjects, totalCount] = await query
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return {
      projects: featuredProjects,
      totalCount,
    };
  }

  @Query(_returns => ProjectUpdate)
  async featuredProjectUpdate(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
  ): Promise<ProjectUpdate> {
    const featuredProject = await FeaturedUpdate.createQueryBuilder(
      'featuredProject',
    )
      .innerJoinAndSelect('featuredProject.projectUpdate', 'projectUpdate')
      .where('featuredProject.projectId = :projectId', {
        projectId,
      })
      .getOne();

    return featuredProject!.projectUpdate;
  }

  @Query(_returns => AllProjects)
  async allProjects(
    // Original query - kept unchanged for backward compatibility
    @Args()
    {
      limit,
      skip,
      searchTerm,
      category,
      mainCategory,
      filters,
      sortingBy,
      connectedWalletUserId,
      campaignSlug,
      qfRoundId,
      qfRoundSlug,
      includeUnlisted,
      projectType,
    }: GetProjectsArgs,
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  ): Promise<AllProjects> {
    let projects: Project[];
    let totalCount: number;
    let activeQfRoundId: number | undefined;

    if (
      sortingBy === SortingField.ActiveQfRoundRaisedFunds ||
      sortingBy === SortingField.EstimatedMatching ||
      sortingBy === SortingField.InstantBoosting
    ) {
      activeQfRoundId = (await findActiveQfRound())?.id;
    }

    const filterQueryParams: FilterProjectQueryInputParams = {
      limit,
      skip,
      searchTerm,
      category,
      mainCategory,
      filters,
      sortingBy,
      qfRoundId,
      qfRoundSlug,
      activeQfRoundId,
      includeUnlisted,
      projectType,
    };
    let campaign;
    if (campaignSlug) {
      campaign = await findCampaignBySlug(campaignSlug);
      if (!campaign) {
        throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
      }
      filterQueryParams.slugArray = campaign.relatedProjectsSlugs;
    }

    const projectsQuery = filterProjectsQuery(filterQueryParams);

    projectsFiltersThreadPool.completed();
    const projectsQueryCacheKey = await projectsFiltersThreadPool.queue(
      hasher =>
        hasher.hashProjectFilters({
          ...filterQueryParams,
          suffix: 'pq',
        }),
    );

    const categoriesResolver = Category.find({
      cache: projectFiltersCacheDuration,
    });

    // eslint-disable-next-line prefer-const
    [projects, totalCount] = await projectsQuery
      .cache(projectsQueryCacheKey, projectFiltersCacheDuration)
      .getManyAndCount();

    const userId = connectedWalletUserId || user?.userId;
    if (projects.length > 0 && userId) {
      const userReactions = await findUserReactionsByProjectIds(
        userId,
        projects.map(project => project.id),
      );

      if (userReactions.length > 0) {
        projects = await projectsFiltersThreadPool.queue(merger =>
          merger.mergeUserReactionsToProjects(projects, userReactions),
        );
      }
    }

    const categories = await categoriesResolver;

    return { projects, totalCount, categories, campaign };
  }

  @Query(_returns => AllProjects)
  async newAllProjects(
    // Optimized query for Multi QF feature - will replace allProjects after FE migration
    @Args()
    {
      limit,
      skip,
      searchTerm,
      category,
      mainCategory,
      filters,
      sortingBy,
      connectedWalletUserId,
      campaignSlug,
      includeUnlisted,
      projectType,
    }: GetOptimizedProjectsArgs,
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  ): Promise<AllProjects> {
    let projects: Project[];
    let totalCount: number;

    // Removed activeQfRoundId logic as it's not needed for optimized query

    const filterQueryParams: FilterProjectQueryInputParams = {
      limit,
      skip,
      searchTerm,
      category,
      mainCategory,
      filters,
      sortingBy,
      // Removed QF-related parameters as they're not needed for optimized query
      includeUnlisted,
      projectType,
    };
    let campaign;
    if (campaignSlug) {
      campaign = await findCampaignBySlug(campaignSlug);
      if (!campaign) {
        throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
      }
      filterQueryParams.slugArray = campaign.relatedProjectsSlugs;
    }

    const projectsQuery = filterProjectsQueryOptimized(filterQueryParams);

    projectsFiltersThreadPool.completed();
    const projectsQueryCacheKey = await projectsFiltersThreadPool.queue(
      hasher =>
        hasher.hashProjectFilters({
          ...filterQueryParams,
          suffix: 'pq',
        }),
    );

    const categoriesResolver = Category.find({
      cache: projectFiltersCacheDuration,
    });

    // eslint-disable-next-line prefer-const
    [projects, totalCount] = await projectsQuery
      .cache(projectsQueryCacheKey, projectFiltersCacheDuration)
      .getManyAndCount();

    const userId = connectedWalletUserId || user?.userId;
    if (projects.length > 0 && userId) {
      const userReactions = await findUserReactionsByProjectIds(
        userId,
        projects.map(project => project.id),
      );

      if (userReactions.length > 0) {
        projects = await projectsFiltersThreadPool.queue(merger =>
          merger.mergeUserReactionsToProjects(projects, userReactions),
        );
      }
    }

    const categories = await categoriesResolver;

    return { projects, totalCount, categories, campaign };
  }

  @Query(_returns => TopProjects)
  async topProjects(
    @Args()
    { take, skip, orderBy, category, connectedWalletUserId }: GetProjectsArgs,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<TopProjects> {
    const { field, direction } = orderBy;
    const order = {};
    order[field] = direction;

    let query = this.projectRepository.createQueryBuilder('project');
    // .innerJoin('project.reactions', 'reaction')
    query = ProjectResolver.addCategoryQuery(query, category);
    query = query
      .where(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .orderBy(`project.${field}`, direction)
      .limit(skip)
      .take(take)
      .innerJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('categories.mainCategory', 'mainCategory');

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    const [projects, totalCount] = await query.getManyAndCount();

    return { projects, totalCount };
  }

  @Query(_returns => Project)
  async projectById(
    @Arg('id') id: number,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: ApolloContext,
    @Info() info: GraphQLResolveInfo,
    @Arg('userRemoved', _type => Boolean, { nullable: true })
    userRemoved?: boolean,
    @Arg('qfRoundsSortBy', _type => String, { nullable: true })
    qfRoundsSortBy?: string,
    @Arg('activeOnly', _type => Boolean, { nullable: true })
    activeOnly?: boolean,
  ) {
    const fields = graphqlFields(info);

    let query = this.projectRepository
      .createQueryBuilder('project')
      .where(`project.id=:id`, {
        id,
      })
      .leftJoinAndSelect('project.status', 'status');

    if (fields.categories) {
      query = query
        .leftJoinAndSelect(
          'project.categories',
          'categories',
          'categories.isActive = :isActive',
          { isActive: true },
        )
        .leftJoinAndSelect('categories.mainCategory', 'mainCategory');
    }
    if (fields.organization) {
      query = query.leftJoinAndSelect('project.organization', 'organization');
    }
    if (fields.projectPower) {
      query = query.leftJoinAndSelect('project.projectPower', 'projectPower');
    }
    if (fields.addresses) {
      query = query.leftJoinAndSelect('project.addresses', 'addresses');
    }
    if (fields.socialMedia) {
      query = query.leftJoinAndSelect('project.socialMedia', 'socialMedia');
    }
    if (fields.anchorContracts) {
      query = query.leftJoinAndSelect(
        'project.anchorContracts',
        'anchor_contract_address',
      );
    }
    if (fields.adminUser) {
      const adminUserFields = Object.keys(fields.adminUser).map(
        field => `user.${field}`,
      );
      const filterByPublicFields = publicSelectionFields.filter(field =>
        adminUserFields.includes(field),
      );
      query = query
        .leftJoin('project.adminUser', 'user')
        .addSelect(
          filterByPublicFields.length > 0
            ? filterByPublicFields
            : publicSelectionFields,
        ); // aliased selection
    }
    if (fields.reaction) {
      query = ProjectResolver.addUserReaction(
        query,
        connectedWalletUserId,
        user,
      );
    }
    if (fields.qfRounds) {
      if (activeOnly) {
        // Only join active QF rounds - project will still be returned with qfRounds: []
        query = query.leftJoinAndSelect(
          'project.qfRounds',
          'qfRounds',
          'qfRounds.isActive = :isActive',
          { isActive: true },
        );
      } else {
        // Join all QF rounds
        query = query.leftJoinAndSelect('project.qfRounds', 'qfRounds');
      }

      // Apply Priority sorting if requested
      if (qfRoundsSortBy === 'priority') {
        query = query
          .addOrderBy('qfRounds.priority', 'DESC')
          .addOrderBy('qfRounds.endDate', 'ASC');
      }
    }

    const project = await query.getOne();

    if (project?.projectType === 'cause') {
      // Load and filter causeProjects based on userRemoved parameter
      project.causeProjects = await (project as Cause).loadCauseProjects(
        userRemoved,
      );
    }

    canUserVisitProject(project, user?.userId);

    return project;
  }

  // Helper method to get the fields of the Project entity
  private getEntityFields(
    entity: typeof Project | typeof ProjectUpdate,
  ): string[] {
    const metadata = getMetadataArgsStorage();
    const columns = metadata.columns.filter(col => col.target === entity);
    return columns.map(col => col.propertyName);
  }

  @Query(_returns => ProjectBySlugResponse)
  async projectBySlug(
    @Arg('slug') slug: string,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: ApolloContext,
    @Info() info: GraphQLResolveInfo,
    @Arg('userRemoved', _type => Boolean, { nullable: true })
    userRemoved?: boolean,
    @Arg('qfRoundsSortBy', _type => String, { nullable: true })
    qfRoundsSortBy?: string,
    @Arg('activeOnly', _type => Boolean, { nullable: true })
    activeOnly?: boolean,
  ) {
    const minimalProject = await findProjectIdBySlug(slug);
    if (!minimalProject) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    // Extract requested fields
    const fields = graphqlFields(info);
    const projectFields = this.getEntityFields(Project);

    // Filter requested fields to only include those in the Project entity
    const selectedFields = Object.keys(fields).filter(field =>
      projectFields.includes(field),
    );

    // Dynamically build the select fields
    const selectFields = selectedFields.map(field => `project.${field}`);

    let query = this.projectRepository
      .createQueryBuilder('project')
      .select(selectFields)
      .where(`project.id = :id`, {
        id: minimalProject.id,
      })
      .leftJoinAndSelect('project.status', 'status');

    if (fields.categories) {
      query = query
        .leftJoinAndSelect(
          'project.categories',
          'categories',
          'categories.isActive = :isActive',
          { isActive: true },
        )
        .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
        .orderBy({
          'mainCategory.title': 'ASC',
          'categories.name': 'ASC',
        });
    }
    if (fields.organization) {
      query = query.leftJoinAndSelect('project.organization', 'organization');
    }
    if (fields.addresses) {
      query = query.leftJoinAndSelect('project.addresses', 'addresses');
    }
    if (fields.socialMedia) {
      query = query.leftJoinAndSelect('project.socialMedia', 'socialMedia');
    }
    if (fields.anchorContracts) {
      query = query.leftJoinAndSelect(
        'project.anchorContracts',
        'anchor_contract_address',
      );
    }
    if (fields.projectPower) {
      query = query.leftJoinAndSelect('project.projectPower', 'projectPower');
    }
    if (fields.projectInstantPower) {
      query = query.leftJoinAndSelect(
        'project.projectInstantPower',
        'projectInstantPower',
      );
    }
    if (fields.qfRounds) {
      if (activeOnly) {
        // Only join active QF rounds - project will still be returned with qfRounds: []
        query = query.leftJoinAndSelect(
          'project.qfRounds',
          'qfRounds',
          'qfRounds.isActive = :isActive',
          { isActive: true },
        );
      } else {
        // Join all QF rounds
        query = query.leftJoinAndSelect('project.qfRounds', 'qfRounds');
      }

      // Apply Priority sorting if requested
      if (qfRoundsSortBy === 'priority') {
        query = query
          .addOrderBy('qfRounds.priority', 'DESC')
          .addOrderBy('qfRounds.endDate', 'ASC');
      }
    }
    if (fields.projectFuturePower) {
      query = query.leftJoinAndSelect(
        'project.projectFuturePower',
        'projectFuturePower',
      );
    }
    if (fields.campaigns) {
      const campaignSlugs = (await getAllProjectsRelatedToActiveCampaigns())[
        minimalProject.id
      ];
      query = query.leftJoinAndMapMany(
        'project.campaigns',
        Campaign,
        'campaigns',
        '((campaigns."relatedProjectsSlugs" && ARRAY[:slug]::text[] OR campaigns."relatedProjectsSlugs" && project."slugHistory") AND campaigns."isActive" = TRUE) OR (campaigns.slug = ANY(:campaignSlugs))',
        {
          slug,
          campaignSlugs,
        },
      );
    }
    if (fields.adminUser) {
      const adminUserFields = Object.keys(fields.adminUser).map(
        field => `user.${field}`,
      );
      const filterByPublicFields = publicSelectionFields.filter(field =>
        adminUserFields.includes(field),
      );
      query = query
        .leftJoinAndSelect('project.adminUser', 'user')
        .addSelect(
          filterByPublicFields.length > 0
            ? filterByPublicFields
            : publicSelectionFields,
        ); // aliased selection
    }
    if (fields.reaction) {
      query = ProjectResolver.addUserReaction(
        query,
        connectedWalletUserId,
        user,
      );
    }

    const project = await query.getOne();
    canUserVisitProject(project, user?.userId);

    if (project?.projectType === 'cause') {
      project.causeProjects = await (project as Cause).loadCauseProjects(
        userRemoved,
      );
    }

    if (fields.verificationFormStatus) {
      const verificationForm = await getVerificationFormStatusByProjectId(
        project?.id as number,
      );
      if (verificationForm) {
        (project as Project).verificationFormStatus = verificationForm?.status;
      }
    }
    if (fields.givbackFactor) {
      const { givbackFactor } = await calculateGivbackFactor(project!.id);
      return { ...project, givbackFactor };
    }
    // We know that we have the project because if we reach this line means minimalProject is not null
    return project;
  }

  @Mutation(_returns => Project)
  async updateProject(
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

    const { image } = newProjectData;

    // const project = await Project.findOne({ id: projectId });
    const project = await findProjectById(projectId);

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

    if (!newProjectData.categories) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
        ),
      );
    }

    const categoriesPromise = newProjectData.categories.map(async category => {
      const [c] = await this.categoryRepository.find({
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
    });

    const categories = await Promise.all(categoriesPromise);
    if (categories.length > 5) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
        ),
      );
    }
    project.categories = categories;

    const heartCount = await Reaction.count({ where: { projectId } });

    const qualityScore = getQualityScore(
      project.description,
      Boolean(image),
      heartCount,
    );
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
    if (image !== undefined) {
      project.image = image;
    }
    project.slug = newSlug;
    project.qualityScore = qualityScore;
    project.updatedAt = new Date();
    project.listed = null;
    project.reviewStatus = ReviewStatus.NotReviewed;
    project.title = convert(newProjectData.title);

    await project.save();
    await project.reload();

    if (!isSocialMediaEqual(project.socialMedia, newProjectData.socialMedia)) {
      await removeProjectSocialMedia(projectId);
      if (newProjectData.socialMedia && newProjectData.socialMedia.length > 0) {
        const socialMediaEntities = newProjectData.socialMedia.map(
          socialMediaInput => {
            return {
              type: socialMediaInput.type,
              link: socialMediaInput.link,
              projectId,
              userId: user.userId,
            };
          },
        );
        await addBulkProjectSocialMedia(socialMediaEntities);
      }
    }

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

    // Edit emails
    await getNotificationAdapter().projectEdited({ project });

    return project;
  }

  @Mutation(_returns => Project)
  async addRecipientAddressToProject(
    @Arg('projectId') projectId: number,
    @Arg('networkId') networkId: number,
    @Arg('address') address: string,
    @Arg('chainType', _type => ChainType, { defaultValue: ChainType.EVM })
    @Arg('memo', { nullable: true })
    memo: string,
    chainType: ChainType,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const project = await findProjectById(projectId);

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));

    if (project.adminUserId !== user.userId) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );
    }

    await validateProjectWalletAddress(address, projectId, chainType, memo);

    const adminUser = (await findUserById(project.adminUserId)) as User;
    await addNewProjectAddress({
      project,
      user: adminUser,
      address,
      networkId,
      isRecipient: true,
      chainType,
      memo: chainType === ChainType.STELLAR ? memo : undefined,
    });

    project.adminUser = adminUser;
    project.addresses = await findProjectRecipientAddressByProjectId({
      projectId,
    });

    return project;
  }

  @Mutation(_returns => ImageResponse)
  async uploadImage(
    @Arg('imageUpload') imageUpload: ImageUpload,
    @Ctx() _ctx: ApolloContext,
  ): Promise<ImageResponse> {
    let url = '';

    if (imageUpload.image) {
      const { filename, createReadStream } = await imageUpload.image;

      try {
        const pinResponse = await pinFile(createReadStream(), filename);
        url = `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${pinResponse.IpfsHash}`;

        const projectImage = this.projectImageRepository.create({
          url,
          projectId: imageUpload.projectId,
        });
        await projectImage.save();

        const response: ImageResponse = {
          url,
          projectId: imageUpload.projectId,
          projectImageId: projectImage.id,
        };
        logger.debug(`response : ${JSON.stringify(response, null, 2)}`);

        return response;
      } catch (e) {
        logger.error('upload image failed in project resolver', e);
        throw Error(i18n.__(translationErrorMessagesKeys.UPLOAD_FAILED));
      }
    }
    throw Error(i18n.__(translationErrorMessagesKeys.UPLOAD_FAILED));
  }

  @Query(_returns => ResourcePerDateRange, { nullable: true })
  async projectsPerDate(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
    @Arg('onlyListed', { nullable: true }) onlyListed?: boolean,
    @Arg('onlyVerified', { nullable: true }) onlyVerified?: boolean,
    @Arg('networkId', { nullable: true }) networkId?: number,
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await totalProjectsPerDate(
        fromDate,
        toDate,
        networkId,
        onlyListed,
        onlyVerified,
      );
      const totalPerMonthAndYear = await totalProjectsPerDateByMonthAndYear(
        fromDate,
        toDate,
        networkId,
        onlyListed,
        onlyVerified,
      );

      return {
        total,
        totalPerMonthAndYear,
      };
    } catch (e) {
      logger.error('donations query error', e);
      throw e;
    }
  }

  @Mutation(_returns => Project)
  async createProject(
    @Arg('project') projectInput: CreateProjectInput,
    @Ctx() ctx: ApolloContext,
  ): Promise<Project> {
    const user = await getLoggedInUser(ctx);
    const { image, description } = projectInput;

    const dbUser = await findUserById(user.id);

    // Check if user email is verified
    if (!dbUser || !dbUser.isEmailVerified) {
      throw new Error(i18n.__(translationErrorMessagesKeys.EMAIL_NOT_VERIFIED));
    }

    const qualityScore = getQualityScore(description, Boolean(image), 0);

    if (!projectInput.categories) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
        ),
      );
    }

    // We do not create categories only use existing ones
    const categories = await Promise.all(
      projectInput.categories
        ? projectInput.categories.map(async category => {
            const [c] = await this.categoryRepository.find({
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

    await validateProjectRelatedAddresses(
      projectInput.addresses as RelatedAddressInputType[],
    );
    await validateProjectTitle(projectInput.title);
    const slugBase = creteSlugFromProject(projectInput.title);
    if (!slugBase) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_PROJECT_TITLE),
      );
    }
    const slug = await getAppropriateSlug(slugBase);

    const status = await this.projectStatusRepository.findOne({
      where: {
        id: projectInput.isDraft ? ProjStatus.drafted : ProjStatus.active,
      },
    });

    const organization = await Organization.findOne({
      where: {
        label: ORGANIZATION_LABELS.GIVETH,
      },
    });
    const now = new Date();
    // const [project] = Project.create({
    //   ...projectInput,
    //
    //   // categories: categories as Category[],
    //   organization,
    //   image,
    //   creationDate: now,
    //   updatedAt: now,
    //   slug: slug.toLowerCase(),
    //   slugHistory: [],
    //   admin: ctx.req.user.userId,
    //   users: [user],
    //   // status,
    //   qualityScore,
    //   totalDonations: 0,
    //   totalReactions: 0,
    //   totalProjectUpdates: 1,
    //   verified: false,
    //   giveBacks: false,
    //   // adminUser: user,
    // });

    const project = Project.create({
      ...projectInput,
      title: convert(projectInput.title),
      categories: categories as Category[],
      organization: organization as Organization,
      image,
      creationDate: now,
      updatedAt: now,
      latestUpdateCreationDate: now,
      slug: slug.toLowerCase(),
      slugHistory: [],
      adminUserId: ctx.req.user.userId,
      status: status as ProjectStatus,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 1,
      verified: false,
      giveBacks: false,
      adminUser: user,
      projectType: 'project',
    });

    await project.save();

    // bad practice: Typeorm bug with single table inheritance using class Name instead of default or set values
    await Project.query(
      `UPDATE "project" SET "projectType" = LOWER("projectType") WHERE "id" = $1`,
      [project.id],
    );

    if (projectInput.socialMedia && projectInput.socialMedia.length > 0) {
      const socialMediaEntities = projectInput.socialMedia.map(
        socialMediaInput => {
          return {
            type: socialMediaInput.type,
            link: socialMediaInput.link,
            projectId: project.id,
            userId: ctx.req.user.userId,
          };
        },
      );
      await addBulkProjectSocialMedia(socialMediaEntities);
    }

    // const adminUser = (await findUserById(Number(newProject.admin))) as User;
    // newProject.adminUser = adminUser;
    await addBulkNewProjectAddress(
      projectInput?.addresses.map(relatedAddress => {
        const { networkId, address, chainType, memo } = relatedAddress;
        return {
          project,
          user,
          address:
            chainType === ChainType.EVM ? address.toLowerCase() : address,
          chainType,
          networkId: getAppropriateNetworkId({
            networkId,
            chainType,
          }),
          isRecipient: true,
          memo,
        };
      }),
    );
    project.addresses = await findProjectRecipientAddressByProjectId({
      projectId: project.id,
    });

    const update = ProjectUpdate.create({
      userId: ctx.req.user.userId,
      projectId: project.id,
      content: '',
      title: '',
      createdAt: new Date(),
      isMain: true,
    });
    await ProjectUpdate.save(update);

    if (projectInput.isDraft) {
      await getNotificationAdapter().projectSavedAsDraft({
        project,
      });
    } else {
      await getNotificationAdapter().projectPublished({
        project,
      });
    }

    return project;
  }

  @Mutation(_returns => ProjectUpdate)
  async addProjectUpdate(
    @Arg('projectId') projectId: number,
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectUpdate> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    if (
      content?.replace(/<[^>]+>/g, '')?.length >
      PROJECT_UPDATE_CONTENT_MAX_LENGTH
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_UPDATE_CONTENT_LENGTH_SIZE_EXCEEDED,
        ),
      );
    }

    const owner = await findUserById(user.userId);

    if (!owner)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    // Check if user email is verified
    if (owner && !owner.isEmailVerified) {
      throw new Error(i18n.__(translationErrorMessagesKeys.EMAIL_NOT_VERIFIED));
    }

    const project = await findProjectById(projectId);

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.adminUserId !== user.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    const update = ProjectUpdate.create({
      userId: user.userId,
      projectId: project.id,
      content,
      title,
      createdAt: new Date(),
      isMain: false,
    });

    const save = await ProjectUpdate.save(update);
    if (project.verificationStatus !== RevokeSteps.Revoked) {
      project.verificationStatus = null;
      await project.save();
    }

    await updateProjectUpdatesStatistics(update.projectId);

    await getNotificationAdapter().projectUpdateAdded({
      project,
      update: title,
    });
    return save;
  }

  @Mutation(_returns => ProjectUpdate)
  async editProjectUpdate(
    @Arg('updateId') updateId: number,
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectUpdate> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    if (
      content?.replace(/<[^>]+>/g, '')?.length >
      PROJECT_UPDATE_CONTENT_MAX_LENGTH
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_UPDATE_CONTENT_LENGTH_SIZE_EXCEEDED,
        ),
      );
    }

    const owner = await findUserById(user.userId);

    if (!owner)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    // Check if user email is verified
    if (owner && !owner.isEmailVerified) {
      throw new Error(i18n.__(translationErrorMessagesKeys.EMAIL_NOT_VERIFIED));
    }

    const update = await ProjectUpdate.findOne({ where: { id: updateId } });
    if (!update)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_UPDATE_NOT_FOUND),
      );

    const project = await Project.findOne({ where: { id: update.projectId } });
    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.adminUserId !== user.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    update.title = title;
    update.content = content;
    await update.save();
    await update.reload();

    return update;
  }

  @Mutation(_returns => Boolean)
  async deleteProjectUpdate(
    @Arg('updateId') updateId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const owner = await findUserById(user.userId);

    if (!owner)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    // Check if user email is verified
    if (owner && !owner.isEmailVerified) {
      throw new Error(i18n.__(translationErrorMessagesKeys.EMAIL_NOT_VERIFIED));
    }

    const update = await ProjectUpdate.findOne({ where: { id: updateId } });
    if (!update)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_UPDATE_NOT_FOUND),
      );

    const project = await Project.findOne({ where: { id: update.projectId } });
    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.adminUserId !== user.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    const [reactions, reactionsCount] = await Reaction.findAndCount({
      where: { projectUpdateId: update.id },
    });

    if (reactionsCount > 0) await Reaction.remove(reactions);

    await ProjectUpdate.delete({ id: update.id });
    await updateProjectUpdatesStatistics(update.projectId);
    return true;
  }

  @Query(_returns => [ProjectUpdate])
  async getProjectUpdates(
    @Arg('projectId', _type => Int) projectId: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Arg('take', _type => Int, { defaultValue: 10 }) take: number,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Arg('orderBy', _type => OrderBy, {
      defaultValue: {
        field: OrderField.CreationAt,
        direction: OrderDirection.DESC,
      },
    })
    orderBy: OrderBy,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectUpdate[]> {
    const { field, direction } = orderBy;
    let query = this.projectUpdateRepository
      .createQueryBuilder('projectUpdate')
      .where(
        'projectUpdate.projectId = :projectId and projectUpdate.isMain = false',
        {
          projectId,
        },
      )
      .orderBy(`projectUpdate.${field}`, direction)
      .take(take)
      .skip(skip);

    const viewerUserId = connectedWalletUserId || user?.userId;
    if (viewerUserId) {
      query = ProjectResolver.addReactionToProjectsUpdateQuery(
        query,
        viewerUserId,
      );
    }
    return query.getMany();
  }

  // TODO after finalizing getPurpleList and when Ashley filled that table we can remove this query and then change
  // givback-calculation script to use  getPurpleList query
  @Query(_returns => [String])
  async getProjectsRecipients(): Promise<string[]> {
    const recipients = await Project.query(
      `
            SELECT "walletAddress" FROM project
            WHERE verified=true and "walletAddress" IS NOT NULL
            `,
    );
    return recipients.map(({ walletAddress }) => walletAddress);
  }

  @Query(_returns => [String])
  async getPurpleList(): Promise<string[]> {
    const relatedAddresses = await getPurpleListAddresses();
    return relatedAddresses.map(({ projectAddress }) => projectAddress);
  }

  @Query(_returns => Boolean)
  async walletAddressIsPurpleListed(
    @Arg('address') address: string,
  ): Promise<boolean> {
    return isWalletAddressInPurpleList(address);
  }

  @Query(_returns => [Token])
  async getProjectAcceptTokens(
    @Arg('projectId') projectId: number,
  ): Promise<Token[]> {
    try {
      const organization = await Organization.createQueryBuilder('organization')
        .innerJoin(
          'organization.projects',
          'project',
          'project.id = :projectId',
          { projectId },
        )
        .leftJoinAndSelect('organization.tokens', 'tokens')
        .leftJoin(
          'project_address',
          'pa',
          'pa.projectId = project.id AND pa.isRecipient = true',
        )
        .andWhere('pa.networkId = tokens.networkId')
        .getOne();

      if (!organization) {
        return [];
      }
      return sortTokensByOrderAndAlphabets(organization.tokens);
    } catch (e) {
      logger.error('getProjectAcceptTokens error', e);
      throw e;
    }
  }

  @Query(_returns => [Reaction])
  async getProjectReactions(
    @Arg('projectId') projectId: number,
    @Ctx() { user: _user }: Context,
  ): Promise<Reaction[]> {
    const update = await ProjectUpdate.findOne({
      where: { projectId, isMain: true },
    });

    return await Reaction.find({
      where: { projectUpdateId: update?.id || -1 },
    });
  }

  // @Query(_returns => Boolean)
  // async isWalletSmartContract(@Arg('address') address: string) {
  //   return isWalletAddressSmartContract(address);
  // }

  @Query(_returns => Boolean)
  async walletAddressIsValid(
    @Arg('address') address: string,
    @Arg('chainType', () => ChainType, { nullable: true })
    chainType?: ChainType, // Explicitly set the type of chainType
    @Arg('memo', { nullable: true }) memo?: string,
  ) {
    return validateProjectWalletAddress(address, undefined, chainType, memo);
  }

  /**
   * Can a project use this title?
   * @param title
   * @param projectId
   * @returns
   */
  @Query(_returns => Boolean)
  async isValidTitleForProject(
    @Arg('title') title: string,
    @Arg('projectId', { nullable: true }) projectId?: number,
  ) {
    if (projectId) {
      return validateProjectTitleForEdit(title, projectId);
    }
    return validateProjectTitle(title);
  }

  @Query(_returns => AllProjects, { nullable: true })
  async projectsByUserId(
    @Arg('userId', _type => Int) userId: number,
    @Arg('take', { defaultValue: 10 }) take: number,
    @Arg('skip', { defaultValue: 0 }) skip: number,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Arg('orderBy', _type => OrderBy, {
      defaultValue: {
        field: OrderField.CreationDate,
        direction: OrderDirection.DESC,
      },
    })
    orderBy: OrderBy,
    @Arg('projectType', _type => String, {
      nullable: true,
      defaultValue: 'project',
    })
    projectType: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const { field, direction } = orderBy;
    // Convert projectType to lowercase to ensure consistent filtering
    const normalizedProjectType = projectType?.toLowerCase() || 'project';

    let query;
    if (normalizedProjectType === 'cause') {
      query = Cause.createQueryBuilder('project');
    } else {
      query = Project.createQueryBuilder('project');
    }

    query = query
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.anchorContracts', 'anchor_contract_address')
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoinAndSelect('project.qfRounds', 'qfRounds')
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields); // aliased selection

    if (userId === user?.userId) {
      query = ProjectResolver.addProjectVerificationForm(
        query,
        connectedWalletUserId,
        user,
      );
    }

    query = query.where('project.adminUserId = :userId', { userId });

    // Filter by projectType
    if (normalizedProjectType) {
      query = query.andWhere('project.projectType = :projectType', {
        projectType: normalizedProjectType,
      });
    }

    if (userId !== user?.userId) {
      query = query.andWhere(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      );
    }

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    const [projects, projectsCount] = await query
      .orderBy(`project.${field}`, direction)
      .take(take)
      .skip(skip)
      .getManyAndCount();

    for (const project of projects) {
      if (project.projectType === 'cause') {
        project.causeProjects = await (project as Cause).loadCauseProjects();
      }
    }

    return {
      projects,
      totalCount: projectsCount,
    };
  }

  @Query(_returns => AllProjects, { nullable: true })
  async projectsBySlugs(
    // TODO Write test cases
    @Arg('slugs', _type => [String]) slugs: string[],
    @Arg('take', { defaultValue: 10 }) take: number,
    @Arg('skip', { defaultValue: 0 }) skip: number,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Arg('orderBy', _type => OrderBy, {
      defaultValue: {
        field: OrderField.CreationDate,
        direction: OrderDirection.DESC,
      },
    })
    orderBy: OrderBy,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const { field, direction } = orderBy;
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields)
      .where(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .andWhere('project.slug IN (:...slugs)', { slugs });

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    const [projects, projectsCount] = await query
      .orderBy(`project.${field}`, direction)
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      projects,
      totalCount: projectsCount,
    };
  }

  @Query(_returns => AllProjects, { nullable: true })
  async similarProjectsBySlug(
    @Arg('slug', _type => String, { nullable: false }) slug: string,
    @Arg('take', _type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    try {
      const viewedProject = await this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.addresses', 'addresses')
        .innerJoinAndSelect(
          'project.categories',
          'categories',
          'categories.isActive = :isActive',
          { isActive: true },
        )
        .where(`project.slug = :slug OR :slug = ANY(project."slugHistory")`, {
          slug,
        })
        .getOne();

      const categoriesIds = viewedProject?.categories.map(
        (category: Category) => {
          return category.id;
        },
      );

      // exclude the viewed project from the result set
      let query = ProjectResolver.similarProjectsBaseQuery(
        user?.userId,
        viewedProject,
      );

      const allProjects: AllProjects = {
        projects: [],
        totalCount: 0,
        categories: [],
      };
      await ProjectResolver.matchExactProjectCategories(
        allProjects,
        query,
        categoriesIds,
        take,
        skip,
      );

      // if not all categories match, match ANY of them
      if (allProjects.totalCount === 0) {
        // overwrite previous query
        query = ProjectResolver.similarProjectsBaseQuery(
          user?.userId,
          viewedProject,
        );
        await ProjectResolver.matchAnyProjectCategory(
          allProjects,
          query,
          categoriesIds,
          take,
          skip,
        );

        // if none match, just grab project owners projects
        if (allProjects.totalCount === 0) {
          query = ProjectResolver.similarProjectsBaseQuery(
            user?.userId,
            viewedProject,
          );
          await ProjectResolver.matchOwnerProjects(
            allProjects,
            query,
            take,
            skip,
            viewedProject?.adminUserId,
          );
        }
      }

      return allProjects;
    } catch (e) {
      logger.error('**similarProjectsBySlug** error', e);
      throw e;
    }
  }

  @Query(_returns => ProjectUpdatesResponse, { nullable: true })
  async projectUpdates(
    @Arg('take', _type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Info() info: GraphQLResolveInfo,
  ): Promise<ProjectUpdatesResponse> {
    const projectsWithLatestUpdates = await Project.createQueryBuilder(
      'project',
    )
      .select(['project.id', 'project.latestUpdateCreationDate'])
      .where('project.statusId = :statusId', { statusId: ProjStatus.active })
      .andWhere('project.reviewStatus = :reviewStatus', {
        reviewStatus: ReviewStatus.Listed,
      })
      .andWhere(
        "DATE_TRUNC('minute', project.latestUpdateCreationDate) != DATE_TRUNC('minute', project.creationDate)",
      )
      .orderBy('project.latestUpdateCreationDate', 'DESC')
      .limit(take)
      .offset(skip)
      .cache(
        `projectsWithLatestUpdates-${take}-${skip}`,
        projectUpdatsCacheDuration,
      )
      .getMany();

    const projectUpdateDates = projectsWithLatestUpdates.map(
      p => p.latestUpdateCreationDate,
    );
    const projectIds = projectsWithLatestUpdates.map(p => p.id);

    // Extract requested fields
    const fields = graphqlFields(info);
    const projectUpdateFields = this.getEntityFields(ProjectUpdate);
    const projectFields = this.getEntityFields(Project);

    // Filter requested fields to only include those in the entity
    const projectUpdateSelectedFields = Object.keys(
      fields.projectUpdates,
    ).filter(field => projectUpdateFields.includes(field));
    const projectSelectedFields = Object.keys(
      fields.projectUpdates.project,
    ).filter(field => projectFields.includes(field));

    // Dynamically build the select fields
    const projectUpdateSelectFields = projectUpdateSelectedFields.map(
      field => `projectUpdate.${field}`,
    );
    const projectSelectFields = projectSelectedFields.map(
      field => `project.${field}`,
    );

    const projectUpdates = await ProjectUpdate.createQueryBuilder(
      'projectUpdate',
    )
      .select(projectUpdateSelectFields)
      .innerJoin('projectUpdate.project', 'project')
      .addSelect(projectSelectFields)
      .where('projectUpdate.projectId IN (:...projectIds)', {
        projectIds,
      })
      .andWhere('projectUpdate.isMain = false')
      .andWhere('projectUpdate.createdAt IN (:...dates)', {
        dates: projectUpdateDates,
      })
      .orderBy('projectUpdate.createdAt', 'DESC')
      .cache(`projectUpdates-${take}-${skip}`, projectUpdatsCacheDuration)
      .getMany();

    return {
      projectUpdates,
    };
  }

  @Query(_returns => AllProjects, { nullable: true })
  async likedProjectsByUserId(
    @Arg('userId', _type => Int, { nullable: false }) userId: number,
    @Arg('take', _type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', _type => Int, { defaultValue: 0 }) skip: number,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .innerJoinAndMapOne(
        'project.reaction',
        Reaction, // viewedUser liked projects join
        'ownerReaction',
        `ownerReaction.projectId = project.id AND ownerReaction.userId = :userId`,
        { userId },
      )
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoinAndSelect('project.qfRounds', 'qfRounds')
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields) // aliased selection
      .where(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      );

    // if user viewing viewedUser liked projects has any liked
    query = ProjectResolver.addUserReaction(query, undefined, user);
    const [projects, totalCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      projects,
      totalCount,
    };
  }

  async updateProjectStatus(inputData: {
    projectId: number;
    statusId: number;
    user: User;
    reasonId?: number;
  }): Promise<Project> {
    const { projectId, statusId, user, reasonId } = inputData;
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    project.mayUpdateStatus(user);
    const status = await ProjectStatus.findOne({ where: { id: statusId } });
    if (!status) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_STATUS_NOT_FOUND),
      );
    }
    const prevStatus = project.status;
    project.status = status;
    project.prevStatusId = prevStatus.id;

    if (statusId === ProjStatus.deactive || statusId === ProjStatus.cancelled) {
      project.reviewStatus = ReviewStatus.NotListed;
      project.listed = false;
    }

    await project.save();

    await Project.addProjectStatusHistoryRecord({
      reasonId,
      project,
      status,
      prevStatus,
      userId: user.id,
    });
    return project;
  }

  @Mutation(_returns => Boolean)
  async deactivateProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: ApolloContext,
    @Arg('reasonId', { nullable: true }) reasonId?: number,
  ): Promise<boolean> {
    try {
      const user = await getLoggedInUser(ctx);
      const project = await this.updateProjectStatus({
        projectId,
        statusId: ProjStatus.deactive,
        user,
        reasonId,
      });

      await getNotificationAdapter().projectDeactivated({
        project,
      });

      // Execute in background, return immediately
      setImmediate(async () => {
        try {
          await Promise.all([
            refreshProjectPowerView(),
            refreshProjectFuturePowerView(),
          ]);
        } catch (error) {
          logger.error('Background power view refresh error:', error);
        }
      });

      if (project.projectType === 'project') {
        await CauseProject.update({ projectId }, { isIncluded: false });
      } else if (project.projectType === 'cause') {
        await CauseProject.update(
          { causeId: project.id },
          { isIncluded: false },
        );
      }

      return true;
    } catch (error) {
      logger.error('projectResolver.deactivateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }

  @Mutation(_returns => Boolean)
  async activateProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: ApolloContext,
  ): Promise<boolean> {
    try {
      const user = await getLoggedInUser(ctx);
      const project = await this.updateProjectStatus({
        projectId,
        statusId: ProjStatus.active,
        user,
      });

      project.listed = null;
      project.reviewStatus = ReviewStatus.NotReviewed;

      await project.save();

      if (project.prevStatusId === ProjStatus.drafted) {
        await getNotificationAdapter().projectPublished({
          project,
        });
      } else {
        await getNotificationAdapter().projectReactivated({
          project,
        });
      }

      // Execute in background, return immediately
      setImmediate(async () => {
        try {
          await Promise.all([
            refreshProjectPowerView(),
            refreshProjectFuturePowerView(),
          ]);
        } catch (error) {
          logger.error('Background power view refresh error:', error);
        }
      });

      if (project.projectType === 'project') {
        await CauseProject.update({ projectId }, { isIncluded: true });
      } else if (project.projectType === 'cause') {
        await CauseProject.update(
          { causeId: project.id },
          { isIncluded: true },
        );
      }

      return true;
    } catch (error) {
      logger.error('projectResolver.activateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }

  @Query(_returns => Token)
  async getTokensDetails(
    @Arg('address') address: string,
    @Arg('networkId') networkId: number,
  ): Promise<Token> {
    try {
      const token = await Token.findOne({
        where: { address, networkId },
      });
      if (!token) {
        throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
      }
      return token;
    } catch (e) {
      logger.error('getTokensDetails error', e);
      throw e;
    }
  }

  @Mutation(_returns => Boolean)
  async deleteDraftProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: ApolloContext,
  ): Promise<boolean> {
    const user = await getLoggedInUser(ctx);
    const project = await findProjectById(projectId);

    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    if (project.adminUserId !== user.id) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );
    }

    if (project.statusId !== ProjStatus.drafted) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ONLY_DRAFTED_PROJECTS_CAN_BE_DELETED,
        ),
      );
    }

    try {
      await removeProjectAndRelatedEntities(project.id);
    } catch (error) {
      logger.error('projectResolver.deleteDraftProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }

    return true;
  }

  @Query(_returns => QfProjectsResponse)
  async qfProjects(
    @Arg('qfRoundId', _type => Int) qfRoundId: number,
    @Args() args: QfProjectsArgs,
    @Ctx() _ctx: ApolloContext,
  ): Promise<QfProjectsResponse> {
    const { limit, skip, searchTerm, filters, sortingBy } = args;
    try {
      // Use the specialized QF round projects function for proper QF-specific sorting
      const [projects, totalCount] = await findQfRoundProjects(qfRoundId, {
        limit,
        skip,
        searchTerm,
        filters,
        sortingBy,
      });

      // Compute round-wide stats once (applies to all projects)
      const anyRound = projects[0]?.qfRounds?.find(qr => qr.id === qfRoundId);
      const commonStats = anyRound
        ? await getQfRoundStats(anyRound)
        : undefined;

      // Transform projects to QfProject format
      const qfProjects: QfProject[] = projects.map(project => {
        const qfRoundStats = commonStats
          ? {
              roundId: qfRoundId,
              totalRaisedInRound: commonStats.totalDonationUsd,
              totalDonorsInRound: commonStats.uniqueDonors,
              // donationsCount: commonStats.donationsCount, // if added to type
            }
          : undefined;

        return {
          id: project.id,
          title: project.title,
          descriptionSummary: project.descriptionSummary,
          description: project.description,
          image: project.image,
          totalRaisedUsd: project.totalDonations,
          verified: project.verified,
          isGivbacksEligible: project.isGivbackEligible,
          slug: project.slug,
          admin: project.adminUser,
          status: project.status,
          reviewStatus: project.reviewStatus,
          projectType: project.projectType,
          projectInstantPower: project.projectInstantPower,
          projectQfRoundRelations: project.projectQfRoundRelations,
          updatedAt: project.updatedAt,
          creationDate: project.creationDate,
          latestUpdateCreationDate: project.latestUpdateCreationDate,
          organization: project.organization,
          activeProjectsCount: project.activeProjectsCount,
          addresses: project.addresses,
          qfRounds: project.qfRounds,
          qfRoundStats,
        };
      });

      return {
        projects: qfProjects,
        totalCount,
      };
    } catch (error) {
      logger.error('projectResolver.qfProjects() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }
}
