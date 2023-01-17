import { Reaction } from '../entities/reaction';
import {
  OrderField,
  Project,
  ProjectUpdate,
  ProjStatus,
  SortingField,
} from '../entities/project';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { ProjectStatus } from '../entities/projectStatus';
import {
  CreateProjectInput,
  ImageUpload,
  UpdateProjectInput,
} from './types/project-input';
import { PubSubEngine } from 'graphql-subscriptions';
import { pinFile } from '../middleware/pinataUtils';
import { Category } from '../entities/category';
import { Donation } from '../entities/donation';
import { ProjectImage } from '../entities/projectImage';
import { MyContext } from '../types/MyContext';
import { NOTIFICATIONS_EVENT_NAMES } from '../analytics/analytics';
import { Max, Min } from 'class-validator';
import { publicSelectionFields, User } from '../entities/user';
import { Context } from '../context';
import { Brackets, Repository } from 'typeorm';
import { Service } from 'typedi';
import slugify from 'slugify';
import SentryLogger from '../sentryLogger';
import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PubSub,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
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
import { updateTotalProjectUpdatesOfAProject } from '../services/projectUpdatesService';
import { logger } from '../utils/logger';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
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
  findProjectRecipientAddressByProjectId,
  getPurpleListAddresses,
  isWalletAddressInPurpleList,
  removeRecipientAddressOfProject,
} from '../repositories/projectAddressRepository';
import { RelatedAddressInputType } from './types/ProjectVerificationUpdateInput';
import {
  findProjectById,
  totalProjectsPerDate,
  totalProjectsPerDateByMonthAndYear,
  userIsOwnerOfProject,
} from '../repositories/projectRepository';
import { sortTokensByOrderAndAlphabets } from '../utils/tokenUtils';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { NETWORK_IDS } from '../provider';
import { getVerificationFormByProjectId } from '../repositories/projectVerificationRepository';
import {
  resourcePerDateReportValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../repositories/projectPowerViewRepository';
import { ResourcePerDateRange } from './donationResolver';
import { creteSlugFromProject } from '../utils/utils';

@ObjectType()
class AllProjects {
  @Field(type => [Project])
  projects: Project[];

  @Field(type => Int)
  totalCount: number;

  @Field(type => [Category], { nullable: true })
  categories: Category[];
}

@ObjectType()
class TopProjects {
  @Field(type => [Project])
  projects: Project[];

  @Field(type => Int)
  totalCount: number;
}

@ObjectType()
class ProjectAndAdmin {
  @Field(type => Project)
  project: Project;

  @Field(type => User, { nullable: true })
  admin: User;
}

enum FilterField {
  Verified = 'verified',
  AcceptGiv = 'givingBlocksId',
  AcceptFundOnGnosis = 'acceptFundOnGnosis',
  Traceable = 'traceCampaignId',
  GivingBlock = 'fromGivingBlock',
  BoostedWithGivPower = 'boostedWithGivPower',
}

enum OrderDirection {
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

@InputType()
class OrderBy {
  @Field(type => OrderField)
  field: OrderField;

  @Field(type => OrderDirection)
  direction: OrderDirection;
}

@InputType()
class FilterBy {
  @Field(type => FilterField, { nullable: true })
  field: FilterField;

  @Field(type => Boolean, { nullable: true })
  value: boolean;
}

@Service()
@ArgsType()
class GetProjectsArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(type => Int, { defaultValue: 10 })
  @Min(0)
  @Max(50)
  limit: number;

  @Field(type => OrderBy, {
    defaultValue: {
      field: OrderField.GIVPower,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: OrderBy;

  @Field(type => String, { nullable: true })
  searchTerm: string;

  @Field({ nullable: true })
  category: string;

  @Field({ nullable: true })
  mainCategory: string;

  @Field(type => FilterBy, {
    nullable: true,
    defaultValue: { field: null, value: null },
  })
  filterBy: FilterBy;

  @Field(type => [FilterField], {
    nullable: true,
    defaultValue: [],
  })
  filters: FilterField[];

  @Field(type => SortingField, {
    nullable: true,
    defaultValue: SortingField.QualityScore,
  })
  sortingBy: SortingField;

  @Field({ nullable: true })
  admin?: number;

  @Field(type => Int, { nullable: true })
  connectedWalletUserId?: number;
}

@Service()
@ArgsType()
class GetProjectArgs {
  @Field(type => ID!, { defaultValue: 0 })
  id: number;
}

@ObjectType()
class GetProjectUpdatesResult {
  @Field(type => ProjectUpdate)
  projectUpdate: ProjectUpdate;
}

@ObjectType()
class ImageResponse {
  @Field(type => String)
  url: string;

  @Field(type => Number, { nullable: true })
  projectId?: number;

  @Field(type => Number)
  projectImageId: number;
}

@Resolver(of => Project)
export class ProjectResolver {
  static addCategoryQuery(
    query: SelectQueryBuilder<Project>,
    category: string,
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
    mainCategory: string,
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
    searchTerm: string,
  ) {
    if (!searchTerm) return query;

    return query.andWhere(
      new Brackets(qb => {
        qb.where('project.title ILIKE :searchTerm', {
          searchTerm: `%${searchTerm}%`,
        })
          .orWhere('project.description ILIKE :searchTerm', {
            searchTerm: `%${searchTerm}%`,
          })
          .orWhere('project.impactLocation ILIKE :searchTerm', {
            searchTerm: `%${searchTerm}%`,
          })
          .orWhere('user.name ILIKE :searchTerm', {
            searchTerm: `%${searchTerm}%`,
          });
      }),
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

  static similarProjectsBaseQuery(
    userId?: number,
    currentProject?: Project,
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
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields) // aliased selection
      .where('project.id != :id', { id: currentProject?.id })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
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
    ownerId?: string,
  ): Promise<AllProjects> {
    query.andWhere('project.admin = :ownerId', { ownerId });
    const [projects, totalCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    allProjects.projects = projects;
    allProjects.totalCount = totalCount;

    return allProjects;
  }

  static addFilterQuery(
    query: SelectQueryBuilder<Project>,
    filter: string,
    filterValue: boolean,
  ) {
    if (!filter) return query;

    if (filter === 'givingBlocksId') {
      const acceptGiv = filterValue ? 'IS' : 'IS NOT';
      return query.andWhere(`project.${filter} ${acceptGiv} NULL`);
    }

    if (filter === 'traceCampaignId') {
      const isRequested = filterValue ? 'IS NOT' : 'IS';
      return query.andWhere(`project.${filter} ${isRequested} NULL`);
    }

    if (filter === 'acceptFundOnGnosis' && filterValue) {
      return query.andWhere(
        new Brackets(subQuery => {
          subQuery.where(
            `EXISTS (
              SELECT *
              FROM project_address
              WHERE "isRecipient" = true AND "networkId" = ${NETWORK_IDS.XDAI} AND "projectId" = project.id
            )`,
          );
        }),
      );
    }

    return query.andWhere(`project.${filter} = ${filterValue}`);
  }

  static addFiltersQuery(
    query: SelectQueryBuilder<Project>,
    filtersArray: FilterField[],
  ) {
    if (filtersArray.length === 0) return query;

    query = query.andWhere(
      new Brackets(subQuery => {
        filtersArray.forEach(filter => {
          if (filter === FilterField.AcceptGiv) {
            // only giving Blocks do not accept Giv
            return subQuery.andWhere(`project.${filter} IS NULL`);
          }

          if (filter === FilterField.GivingBlock) {
            return subQuery.andWhere('project.givingBlocksId IS NOT NULL');
          }

          if (filter === FilterField.Traceable) {
            return subQuery.andWhere(`project.${filter} IS NOT NULL`);
          }
          if (filter === FilterField.BoostedWithGivPower) {
            return subQuery.andWhere(`projectPower.totalPower > 0`);
          }
          if (filter === FilterField.AcceptFundOnGnosis && filter) {
            return subQuery.andWhere(
              `EXISTS (
                        SELECT *
                        FROM project_address
                        WHERE "isRecipient" = true AND "networkId" = ${NETWORK_IDS.XDAI} AND "projectId" = project.id
                      )`,
            );
          }

          return subQuery.andWhere(`project.${filter} = true`);
        });
      }),
    );

    return query;
  }

  private static addUserReaction<T>(
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

  private static addProjectVerificationForm<T>(
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
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectUpdate)
    private readonly projectUpdateRepository: Repository<ProjectUpdate>,
    @InjectRepository(ProjectStatus)
    private readonly projectStatusRepository: Repository<ProjectStatus>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(ProjectImage)
    private readonly projectImageRepository: Repository<ProjectImage>,
  ) {}

  // Backward Compatible Projects Query with added pagination, frontend sorts and category search
  @Query(returns => AllProjects)
  async projects(
    @Args()
    {
      take,
      skip,
      orderBy,
      searchTerm,
      category,
      mainCategory,
      filterBy,
      admin,
      connectedWalletUserId,
    }: GetProjectsArgs,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<AllProjects> {
    const categories = await Category.find();
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.users', 'users')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      // you can alias it as user, but it still is mapped as adminUser
      // like defined in our project entity
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields) // aliased selection
      .leftJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      )
      .leftJoin('project.projectPower', 'projectPower')
      .addSelect([
        'projectPower.totalPower',
        'projectPower.powerRank',
        'projectPower.round',
      ]);
    // Filters
    query = ProjectResolver.addCategoryQuery(query, category);
    query = ProjectResolver.addMainCategoryQuery(query, mainCategory);
    query = ProjectResolver.addSearchQuery(query, searchTerm);
    query = ProjectResolver.addFilterQuery(
      query,
      filterBy?.field,
      filterBy?.value,
    );
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    switch (orderBy.field) {
      case OrderField.Traceable:
        // const traceableDirection: {
        //   [key: string]: 'NULLS FIRST' | 'NULLS LAST';
        // } = {
        //   ASC: 'NULLS FIRST',
        //   DESC: 'NULLS LAST',
        // };
        //
        // query.orderBy(
        //   `project.${orderBy.field}`,
        //   orderBy.direction,
        //   traceableDirection[orderBy.direction],
        // );

        query.andWhere(
          `project.${orderBy.field} IS${
            orderBy.direction === OrderDirection.ASC ? '' : ' NOT'
          } NULL`,
        );
        query.orderBy(
          `project.${OrderField.CreationDate}`,
          OrderDirection.DESC,
        );
        break;
      case OrderField.AcceptGiv:
        // const acceptGivDirection: {
        //   [key: string]: 'NULLS FIRST' | 'NULLS LAST';
        // } = {
        //   ASC: 'NULLS LAST',
        //   DESC: 'NULLS FIRST',
        // };
        //
        // query.orderBy(
        //   `project.${orderBy.field}`,
        //   orderBy.direction,
        //   acceptGivDirection[orderBy.direction],
        // );
        query.andWhere(
          `project.${orderBy.field} IS${
            orderBy.direction === OrderDirection.DESC ? '' : ' NOT'
          } NULL`,
        );
        query.orderBy(
          `project.${OrderField.CreationDate}`,
          OrderDirection.DESC,
        );
        break;
      case OrderField.Verified:
        query.andWhere(`project.${orderBy.field} = true`);
        query.orderBy(`project.${OrderField.CreationDate}`, orderBy.direction);
        break;
      case OrderField.GIVPower:
        query
          .orderBy('projectPower.totalPower', orderBy.direction, 'NULLS LAST')
          .addOrderBy(
            `project.${OrderField.CreationDate}`,
            OrderDirection.DESC,
          );
        break;
      default:
        query.orderBy(`project.${orderBy.field}`, orderBy.direction);
        break;
    }

    const [projects, totalCount] = await query
      .take(take)
      .skip(skip)
      .getManyAndCount();
    return { projects, totalCount, categories };
  }

  @Query(returns => AllProjects)
  async allProjects(
    @Args()
    {
      limit,
      skip,
      searchTerm,
      category,
      mainCategory,
      filters,
      sortingBy,
      admin,
      connectedWalletUserId,
    }: GetProjectsArgs,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<AllProjects> {
    const categories = await Category.find();
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.users', 'users')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      // you can alias it as user but it still is mapped as adminUser
      // like defined in our project entity
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields) // aliased selection
      .leftJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
      .leftJoin('project.projectPower', 'projectPower')
      .addSelect([
        'projectPower.totalPower',
        'projectPower.powerRank',
        'projectPower.round',
      ])
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      );

    // Filters
    query = ProjectResolver.addCategoryQuery(query, category);
    query = ProjectResolver.addMainCategoryQuery(query, mainCategory);
    query = ProjectResolver.addSearchQuery(query, searchTerm);
    query = ProjectResolver.addFiltersQuery(query, filters);
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    switch (sortingBy) {
      case SortingField.MostFunded:
        query.orderBy('project.totalDonations', OrderDirection.DESC);
        break;
      case SortingField.MostLiked:
        query.orderBy('project.totalReactions', OrderDirection.DESC);
        break;
      case SortingField.Newest:
        query.orderBy('project.creationDate', OrderDirection.DESC);
        break;
      case SortingField.Oldest:
        query.orderBy('project.creationDate', OrderDirection.ASC);
        break;
      case SortingField.QualityScore:
        query.orderBy('project.qualityScore', OrderDirection.DESC);
        break;
      case SortingField.GIVPower:
        query
          .orderBy(`project.verified`, OrderDirection.DESC)
          .addOrderBy(
            'projectPower.totalPower',
            OrderDirection.DESC,
            'NULLS LAST',
          );

        break;
      default:
        query
          .orderBy('projectPower.totalPower', OrderDirection.DESC)
          .addOrderBy(`project.verified`, OrderDirection.DESC);
        break;
    }

    const [projects, totalCount] = await query
      .take(limit)
      .skip(skip)
      .getManyAndCount();
    return { projects, totalCount, categories };
  }

  @Query(returns => TopProjects)
  async topProjects(
    @Args()
    { take, skip, orderBy, category, connectedWalletUserId }: GetProjectsArgs,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<TopProjects> {
    const { field, direction } = orderBy;
    const order = {};
    order[field] = direction;

    let query = this.projectRepository.createQueryBuilder('project');
    // .innerJoin('project.reactions', 'reaction')
    query = ProjectResolver.addCategoryQuery(query, category);
    query = query
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
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

  @Query(returns => Project)
  async projectById(
    @Arg('id') id: number,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .where(`project.id=:id`, {
        id,
      })
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields); // aliased selection
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);
    const project = await query.getOne();

    canUserVisitProject(project, String(user?.userId));

    return project;
  }

  // Move this to it's own resolver later
  @Query(returns => Project)
  async projectBySlug(
    @Arg('slug') slug: string,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    const viewerUserId = connectedWalletUserId || user?.userId;
    let isOwnerOfProject = false;

    // ensure it's the owner
    if (viewerUserId) {
      isOwnerOfProject = await userIsOwnerOfProject(viewerUserId, slug);
    }

    let query = this.projectRepository
      .createQueryBuilder('project')
      // check current slug and previous slugs
      .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
        slug,
      })
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect(
        'project.categories',
        'categories',
        'categories.isActive = :isActive',
        { isActive: true },
      )
      .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
      .leftJoinAndSelect('project.organization', 'organization')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.projectPower', 'projectPower')
      .leftJoinAndSelect('project.projectFuturePower', 'projectFuturePower')
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields); // aliased selection

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    if (isOwnerOfProject) {
      query = ProjectResolver.addProjectVerificationForm(
        query,
        connectedWalletUserId,
        user,
      );
    }

    query = query.orderBy({
      'mainCategory.title': 'ASC',
      'categories.name': 'ASC',
    });

    const project = await query.getOne();
    canUserVisitProject(project, String(user?.userId));
    const verificationForm =
      project?.projectVerificationForm ||
      (await getVerificationFormByProjectId(project?.id as number));
    if (verificationForm) {
      (project as Project).verificationFormStatus = verificationForm?.status;
    }

    return project;
  }

  @Mutation(returns => Project)
  async updateProject(
    @Arg('projectId') projectId: number,
    @Arg('newProjectData') newProjectData: UpdateProjectInput,
    @Ctx() { req: { user } }: MyContext,
  ) {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    const { image } = newProjectData;

    // const project = await Project.findOne({ id: projectId });
    const project = await findProjectById(projectId);

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));

    logger.debug(`project.admin ---> : ${project.admin}`);
    logger.debug(`user.userId ---> : ${user.userId}`);
    logger.debug(`updateProject, inputData :`, newProjectData);
    if (project.admin !== String(user.userId))
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    for (const field in newProjectData) {
      if (field === 'addresses') {
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
        name: category,
        isActive: true,
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

    const heartCount = await Reaction.count({
      projectId,
    });

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

    await project.save();
    const adminUser = (await findUserById(Number(project.admin))) as User;
    if (newProjectData.addresses) {
      await removeRecipientAddressOfProject({ project });
      await addBulkNewProjectAddress(
        newProjectData?.addresses.map(relatedAddress => {
          return {
            project,
            user: adminUser,
            address: relatedAddress.address,
            networkId: relatedAddress.networkId,
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

  @Mutation(returns => ImageResponse)
  async uploadImage(
    @Arg('imageUpload') imageUpload: ImageUpload,
    @Ctx() ctx: MyContext,
  ): Promise<ImageResponse> {
    const user = await getLoggedInUser(ctx);
    let url = '';

    if (imageUpload.image) {
      const { filename, createReadStream, encoding } = await imageUpload.image;

      try {
        const pinResponse = await pinFile(
          createReadStream(),
          filename,
          encoding,
        );
        url = `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${pinResponse.data.IpfsHash}`;

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
        throw Error(i18n.__(translationErrorMessagesKeys.UPLOAD_FAILED));
      }
    }
    throw Error(i18n.__(translationErrorMessagesKeys.UPLOAD_FAILED));
  }

  @Query(returns => ResourcePerDateRange, { nullable: true })
  async projectsPerDate(
    // fromDate and toDate should be in this format YYYYMMDD HH:mm:ss
    @Arg('fromDate', { nullable: true }) fromDate?: string,
    @Arg('toDate', { nullable: true }) toDate?: string,
  ): Promise<ResourcePerDateRange> {
    try {
      validateWithJoiSchema(
        { fromDate, toDate },
        resourcePerDateReportValidator,
      );
      const total = await totalProjectsPerDate(fromDate, toDate);
      const totalPerMonthAndYear = await totalProjectsPerDateByMonthAndYear(
        fromDate,
        toDate,
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

  @Mutation(returns => Project)
  async createProject(
    @Arg('project') projectInput: CreateProjectInput,
    @Ctx() ctx: MyContext,
    @PubSub() pubSub: PubSubEngine,
  ): Promise<Project> {
    const user = await getLoggedInUser(ctx);
    const { image, description } = projectInput;

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
              name: category,
              isActive: true,
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
    const slug = await getAppropriateSlug(slugBase);

    const status = await this.projectStatusRepository.findOne({
      id: projectInput.isDraft ? ProjStatus.drafted : ProjStatus.active,
    });

    const organization = await Organization.findOne({
      label: ORGANIZATION_LABELS.GIVETH,
    });
    const now = new Date();
    const project = this.projectRepository.create({
      ...projectInput,
      categories,
      organization,
      image,
      creationDate: now,
      updatedAt: now,
      slug: slug.toLowerCase(),
      slugHistory: [],
      admin: ctx.req.user.userId,
      users: [user],
      status,
      qualityScore,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 1,
      verified: false,
      giveBacks: false,
      adminUser: user,
    });

    const newProject = await this.projectRepository.save(project);
    const adminUser = (await findUserById(Number(newProject.admin))) as User;
    newProject.adminUser = adminUser;
    await addBulkNewProjectAddress(
      projectInput?.addresses.map(relatedAddress => {
        return {
          project,
          user: adminUser,
          address: relatedAddress.address.toLowerCase(),
          networkId: relatedAddress.networkId,
          isRecipient: true,
        };
      }),
    );
    newProject.addresses = await findProjectRecipientAddressByProjectId({
      projectId: project.id,
    });

    const update = await ProjectUpdate.create({
      userId: ctx.req.user.userId,
      projectId: newProject.id,
      content: '',
      title: '',
      createdAt: new Date(),
      isMain: true,
    });
    await ProjectUpdate.save(update);

    if (projectInput.isDraft) {
      await getNotificationAdapter().projectSavedAsDraft({
        project: newProject,
      });
    } else {
      await getNotificationAdapter().projectPublished({
        project: newProject,
      });
    }

    return newProject;
  }

  @Mutation(returns => ProjectUpdate)
  async addProjectUpdate(
    @Arg('projectId') projectId: number,
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectUpdate> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const owner = await findUserById(user.userId);

    if (!owner)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    const project = await findProjectById(projectId);

    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.admin !== String(user.userId))
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    const update = await ProjectUpdate.create({
      userId: user.userId,
      projectId: project.id,
      content,
      title,
      createdAt: new Date(),
      isMain: false,
    });

    const projectUpdateInfo = {
      title: project.title,
      email: owner.email,
      slug: project.slug,
      update: title,
      projectId: project.id,
      firstName: owner.firstName,
    };
    const save = await ProjectUpdate.save(update);

    await updateTotalProjectUpdatesOfAProject(update.projectId);

    await getNotificationAdapter().projectUpdateAdded({
      project,
      update: title,
    });
    return save;
  }

  @Mutation(returns => ProjectUpdate)
  async editProjectUpdate(
    @Arg('updateId') updateId: number,
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectUpdate> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_UPDATE_NOT_FOUND),
      );

    const project = await Project.findOne({ id: update.projectId });
    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.admin !== String(user.userId))
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    update.title = title;
    update.content = content;

    return update.save();
  }

  @Mutation(returns => Boolean)
  async deleteProjectUpdate(
    @Arg('updateId') updateId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<Boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_UPDATE_NOT_FOUND),
      );

    const project = await Project.findOne({ id: update.projectId });
    if (!project)
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    if (project.admin !== String(user.userId))
      throw new Error(
        i18n.__(translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT),
      );

    const [reactions, reactionsCount] = await Reaction.findAndCount({
      where: { projectUpdateId: update.id },
    });

    if (reactionsCount > 0) await Reaction.remove(reactions);

    await ProjectUpdate.delete({ id: update.id });
    await updateTotalProjectUpdatesOfAProject(update.projectId);
    return true;
  }

  @Query(returns => [ProjectUpdate])
  async getProjectUpdates(
    @Arg('projectId', type => Int) projectId: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Arg('orderBy', type => OrderBy, {
      defaultValue: {
        field: OrderField.CreationAt,
        direction: OrderDirection.DESC,
      },
    })
    orderBy: OrderBy,
    @Ctx() { req: { user } }: MyContext,
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
      query = query.leftJoinAndMapOne(
        'projectUpdate.reaction',
        Reaction,
        'reaction',
        'reaction.projectUpdateId = projectUpdate.id AND reaction.userId = :viewerUserId',
        { viewerUserId },
      );
    }
    return query.getMany();
  }

  // TODO after finalizing getPurpleList and when Ashley filled that table we can remove this query and then change
  // givback-calculation script to use  getPurpleList query
  @Query(returns => [String])
  async getProjectsRecipients(): Promise<String[]> {
    const recipients = await Project.query(
      `
            SELECT "walletAddress" FROM project
            WHERE verified=true and "walletAddress" IS NOT NULL
            `,
    );
    return recipients.map(({ walletAddress }) => walletAddress);
  }

  @Query(returns => [String])
  async getPurpleList(): Promise<String[]> {
    const relatedAddresses = await getPurpleListAddresses();
    return relatedAddresses.map(({ projectAddress }) => projectAddress);
  }

  @Query(returns => Boolean)
  async walletAddressIsPurpleListed(
    @Arg('address') address: string,
  ): Promise<Boolean> {
    return isWalletAddressInPurpleList(address);
  }

  @Query(returns => [Token])
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

  @Query(returns => [Reaction])
  async getProjectReactions(
    @Arg('projectId') projectId: number,
    @Ctx() { user }: Context,
  ): Promise<Reaction[]> {
    const update = await ProjectUpdate.findOne({
      where: { projectId, isMain: true },
    });

    return await Reaction.find({
      where: { projectUpdateId: update?.id || -1 },
    });
  }

  // @Query(returns => Boolean)
  // async isWalletSmartContract(@Arg('address') address: string) {
  //   return isWalletAddressSmartContract(address);
  // }

  /**
   * Can a project use this wallet?
   * @param address wallet address
   * @returns
   */
  @Query(returns => Boolean)
  async walletAddressIsValid(@Arg('address') address: string) {
    return validateProjectWalletAddress(address);
  }

  /**
   * Can a project use this title?
   * @param title
   * @param projectId
   * @returns
   */
  @Query(returns => Boolean)
  async isValidTitleForProject(
    @Arg('title') title: string,
    @Arg('projectId', { nullable: true }) projectId?: number,
  ) {
    if (projectId) {
      return validateProjectTitleForEdit(title, projectId);
    }
    return validateProjectTitle(title);
  }

  @Query(returns => AllProjects, { nullable: true })
  async projectsByUserId(
    @Arg('userId', type => Int) userId: number,
    @Arg('take', { defaultValue: 10 }) take: number,
    @Arg('skip', { defaultValue: 0 }) skip: number,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Arg('orderBy', type => OrderBy, {
      defaultValue: {
        field: OrderField.CreationDate,
        direction: OrderDirection.DESC,
      },
    })
    orderBy: OrderBy,
    @Ctx() { req: { user } }: MyContext,
  ) {
    const { field, direction } = orderBy;
    let query = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      .innerJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields); // aliased selection

    if (userId === user?.userId) {
      query = ProjectResolver.addProjectVerificationForm(
        query,
        connectedWalletUserId,
        user,
      );
    }

    query = query.where('project.admin = :userId', { userId: String(userId) });

    if (userId !== user?.userId) {
      query = query.andWhere(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      );
    }

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

  @Query(returns => AllProjects, { nullable: true })
  async similarProjectsBySlug(
    @Arg('slug', type => String, { nullable: false }) slug: string,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Ctx() { req: { user } }: MyContext,
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
            viewedProject?.admin,
          );
        }
      }

      return allProjects;
    } catch (e) {
      logger.error('**similarProjectsBySlug** error', e);
      throw e;
    }
  }

  @Query(returns => AllProjects, { nullable: true })
  async likedProjectsByUserId(
    @Arg('userId', type => Int, { nullable: false }) userId: number,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
    @Ctx() { req: { user } }: MyContext,
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
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields) // aliased selection
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
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
    const status = await ProjectStatus.findOne({ id: statusId });
    if (!status) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_STATUS_NOT_FOUND),
      );
    }
    const prevStatus = project.status;
    project.status = status;
    project.prevStatusId = prevStatus.id;
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

  @Mutation(returns => Boolean)
  async deactivateProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: MyContext,
    @Arg('reasonId', { nullable: true }) reasonId?: number,
  ): Promise<Boolean> {
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
      await Promise.all([
        refreshProjectPowerView(),
        refreshProjectFuturePowerView(),
      ]);
      return true;
    } catch (error) {
      logger.error('projectResolver.deactivateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }
  @Mutation(returns => Boolean)
  async activateProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: MyContext,
  ): Promise<Boolean> {
    try {
      const user = await getLoggedInUser(ctx);
      const project = await this.updateProjectStatus({
        projectId,
        statusId: ProjStatus.active,
        user,
      });

      project.listed = null;
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
      await Promise.all([
        refreshProjectPowerView(),
        refreshProjectFuturePowerView(),
      ]);
      return true;
    } catch (error) {
      logger.error('projectResolver.activateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }
}
