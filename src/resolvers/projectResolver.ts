import NotificationPayload from '../entities/notificationPayload';
import { Reaction, REACTION_TYPE } from '../entities/reaction';
import {
  OrderField,
  Project,
  ProjectUpdate,
  ProjStatus,
} from '../entities/project';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { ProjectStatus } from '../entities/projectStatus';
import { ImageUpload, ProjectInput } from './types/project-input';
import { PubSubEngine } from 'graphql-subscriptions';
import { pinFile } from '../middleware/pinataUtils';
import { UserPermissions } from '../permissions';
import { Category } from '../entities/category';
import { Donation } from '../entities/donation';
import { ProjectImage } from '../entities/projectImage';
import { triggerBuild } from '../netlify/build';
import { MyContext } from '../types/MyContext';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import { Max, Min } from 'class-validator';
import { User } from '../entities/user';
import { Context } from '../context';
import { Brackets, Repository } from 'typeorm';
import { Service } from 'typedi';
import config from '../config';
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
import { errorMessages } from '../utils/errorMessages';
import {
  validateProjectTitle,
  validateProjectTitleForEdit,
  validateProjectWalletAddress,
} from '../utils/validators/projectValidator';
import { updateTotalProjectUpdatesOfAProject } from '../services/projectUpdatesService';
import { dispatchProjectUpdateEvent } from '../services/trace/traceService';
import { logger } from '../utils/logger';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';

const analytics = getAnalytics();

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
  Traceable = 'traceCampaignId',
}

enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

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

function checkIfUserInRequest(ctx: MyContext) {
  if (!ctx.req.user) {
    throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
  }
}

async function getLoggedInUser(ctx: MyContext) {
  checkIfUserInRequest(ctx);

  const user = await User.findOne({ id: ctx.req.user.userId });

  if (!user) {
    const errorMessage = `No user with userId ${ctx.req.user.userId} found. This userId comes from the token. Please check the pm2 logs for the token. Search for 'Non-existant userToken' to see the token`;
    const userMessage = 'Access denied';
    SentryLogger.captureMessage(errorMessage);
    logger.error(
      `Non-existant userToken for userId ${ctx.req.user.userId}. Token is ${ctx.req.user.token}`,
    );
    throw new Error(userMessage);
  }

  return user;
}

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

  @Field(type => OrderBy, {
    defaultValue: {
      field: OrderField.QualityScore,
      direction: OrderDirection.DESC,
    },
  })
  orderBy: OrderBy;

  @Field(type => String, { nullable: true })
  searchTerm: string;

  @Field({ nullable: true })
  category: string;

  @Field(type => FilterBy, {
    nullable: true,
    defaultValue: { field: null, value: null },
  })
  filterBy: FilterBy;

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
          });
      }),
    );
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

    return query.andWhere(`project.${filter} = ${filterValue}`);
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
    private userPermissions: UserPermissions,
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
      // TODO It was very expensive query and made our backend down in production, maybe we should remove the reactions as well
      // .leftJoinAndSelect('project.donations', 'donations')
      .leftJoinAndSelect('project.users', 'users')
      .leftJoinAndMapOne(
        'project.adminUser',
        User,
        'user',
        'user.id = CAST(project.admin AS INTEGER)',
      )
      .innerJoinAndSelect('project.categories', 'c')
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      );

    // Filters
    query = ProjectResolver.addCategoryQuery(query, category);
    query = ProjectResolver.addSearchQuery(query, searchTerm);
    query = ProjectResolver.addFilterQuery(
      query,
      filterBy?.field,
      filterBy?.value,
    );
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    if (orderBy.field === 'traceCampaignId') {
      // TODO: PRISMA will fix this, temporary fix inverting nulls.
      const traceableDirection = {
        ASC: 'NULLS FIRST',
        DESC: 'NULLS LAST',
      };
      query.orderBy(
        `project.${orderBy.field}`,
        orderBy.direction,
        // @ts-ignore
        traceableDirection[orderBy.direction],
      );
    } else {
      query.orderBy(`project.${orderBy.field}`, orderBy.direction);
    }

    const [projects, totalCount] = await query
      .take(take)
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
    if (category) {
      query = query.innerJoin(
        'project.categories',
        'category',
        'category.name = :category',
        { category },
      );
    }
    query = query
      .where(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      )
      .orderBy(`project.${field}`, direction)
      .limit(skip)
      .take(take)
      .innerJoinAndSelect('project.categories', 'c');

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    const [projects, totalCount] = await query.getManyAndCount();

    return { projects, totalCount };
  }

  @Query(returns => [Project])
  async project(@Args() { id }: GetProjectArgs): Promise<Project[]> {
    return this.projectRepository.find({ id });
  }

  // Move this to it's own resolver latere
  @Query(returns => Project)
  async projectById(@Arg('id') id: number) {
    return await this.projectRepository.findOne({
      where: { id },
      relations: ['reactions'],
    });
  }

  // Move this to it's own resolver later
  @Query(returns => Project)
  async projectBySlug(
    @Arg('slug') slug: string,
    @Arg('connectedWalletUserId', { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      // check current slug and previous slugs
      .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
        slug,
      })
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.categories', 'categories')
      // TODO It was very expensive query and made our backend down in production, maybe we should remove the reactions as well
      // .leftJoinAndSelect('project.donations', 'donations')
      .leftJoinAndMapOne(
        'project.adminUser',
        User,
        'user',
        'user.id = CAST(project.admin AS INTEGER)',
      );
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);
    return await query.getOne();
  }

  @Mutation(returns => Project)
  async editProject(
    @Arg('projectId') projectId: number,
    @Arg('newProjectData') newProjectData: ProjectInput,
    @Ctx() { req: { user } }: MyContext,
  ) {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const project = await Project.findOne({ id: projectId });

    if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);
    logger.debug(`project.admin ---> : ${project.admin}`);
    logger.debug(`user.userId ---> : ${user.userId}`);
    if (project.admin !== String(user.userId))
      throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);

    for (const field in newProjectData) project[field] = newProjectData[field];

    if (!newProjectData.categories) {
      throw new Error(
        errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
      );
    }

    const categoriesPromise = newProjectData.categories.map(async category => {
      const [c] = await this.categoryRepository.find({ name: category });
      if (c === undefined) {
        throw new Error(
          errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
        );
      }
      return c;
    });

    const categories = await Promise.all(categoriesPromise);
    if (categories.length > 5) {
      throw new Error(
        errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
      );
    }
    project.categories = categories;

    let imagePromise: Promise<string | undefined> = Promise.resolve(undefined);

    const { imageUpload, imageStatic } = newProjectData;
    if (imageUpload) {
      const { filename, createReadStream, encoding } = await imageUpload;

      try {
        imagePromise = pinFile(createReadStream(), filename, encoding).then(
          response => {
            return (
              'https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash
            );
          },
        );
      } catch (e) {
        logger.error('editProject() error', e);
        throw Error('Upload file failed');
      }
    } else if (imageStatic) {
      imagePromise = Promise.resolve(imageStatic);
    }

    if (!!imageUpload || !!imageStatic) {
      const [image] = await Promise.all([imagePromise]);
      project.image = image;
    }

    const [hearts, heartCount] = await Reaction.findAndCount({
      projectId,
    });

    const qualityScore = this.getQualityScore(
      project.description,
      !!imageUpload,
      heartCount,
    );
    if (newProjectData.title) {
      await validateProjectTitleForEdit(newProjectData.title, projectId);
    }
    if (newProjectData.walletAddress) {
      await validateProjectWalletAddress(
        newProjectData.walletAddress,
        projectId,
      );
    }

    const slugBase = slugify(newProjectData.title);
    const newSlug = await this.getAppropriateSlug(slugBase);
    if (project.slug !== newSlug && !project.slugHistory?.includes(newSlug)) {
      // it's just needed for editProject, we dont add current slug in slugHistory so it's not needed to do this in addProject
      project.slugHistory?.push(project.slug as string);
    }
    project.slug = newSlug;
    project.qualityScore = qualityScore;
    project.listed = null;
    await project.save();

    // We dont wait for trace reponse, because it may increase our response time
    dispatchProjectUpdateEvent(project);
    return project;
  }

  // getQualityScore (projectInput) {
  getQualityScore(description, hasImageUpload, heartCount) {
    const heartScore = 10;
    let qualityScore = 40;

    if (description.length > 100) qualityScore = qualityScore + 10;
    if (hasImageUpload) qualityScore = qualityScore + 30;

    if (heartCount) {
      qualityScore = heartCount * heartScore;
    }
    return qualityScore;
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
        url = 'https://gateway.pinata.cloud/ipfs/' + pinResponse.data.IpfsHash;

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
        throw Error('Upload file failed');
      }
    }
    throw Error('Upload file failed');
  }

  @Mutation(returns => Project)
  async addProject(
    @Arg('project') projectInput: ProjectInput,
    @Ctx() ctx: MyContext,
    @PubSub() pubSub: PubSubEngine,
  ): Promise<Project> {
    const user = await getLoggedInUser(ctx);

    const qualityScore = this.getQualityScore(
      projectInput.description,
      !!projectInput.imageUpload,
      0,
    );

    if (!projectInput.categories) {
      throw new Error(
        errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
      );
    }

    // We do not create categories only use existing ones
    const categoriesPromise = Promise.all(
      projectInput.categories
        ? projectInput.categories.map(async category => {
            const [c] = await this.categoryRepository.find({ name: category });
            if (c === undefined) {
              throw new Error(
                errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
              );
            }
            return c;
          })
        : [],
    );

    let imagePromise: Promise<string | undefined> = Promise.resolve(undefined);

    const { imageUpload, imageStatic } = projectInput;
    if (imageUpload) {
      const { filename, createReadStream, encoding } = await imageUpload;
      try {
        imagePromise = pinFile(createReadStream(), filename, encoding).then(
          response => {
            return (
              'https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash
            );
          },
        );
      } catch (e) {
        logger.error('addProject() error', e);
        throw Error('Upload file failed');
      }
    } else if (imageStatic) {
      imagePromise = Promise.resolve(imageStatic);
    }

    const [categories, image] = await Promise.all([
      categoriesPromise,
      imagePromise,
    ]);
    if (categories.length > 5) {
      throw new Error(
        errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
      );
    }
    await validateProjectWalletAddress(projectInput.walletAddress);
    await validateProjectTitle(projectInput.title);
    const slugBase = slugify(projectInput.title);
    const slug = await this.getAppropriateSlug(slugBase);
    const status = await this.projectStatusRepository.findOne({
      id: ProjStatus.active,
    });

    const project = this.projectRepository.create({
      ...projectInput,
      categories,
      image,
      creationDate: new Date(),
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
    });

    const newProject = await this.projectRepository.save(project);

    const update = await ProjectUpdate.create({
      userId: ctx.req.user.userId,
      projectId: newProject.id,
      content: '',
      title: '',
      createdAt: new Date(),
      isMain: true,
    });
    await ProjectUpdate.save(update);

    logger.debug(
      `projectInput.projectImageIds : ${JSON.stringify(
        projectInput.projectImageIds,
        null,
        2,
      )}`,
    );

    // Associate already uploaded images:
    if (projectInput.projectImageIds) {
      logger.debug(
        'updating projectInput.projectImageIds',
        projectInput.projectImageIds,
      );

      // await ProjectImage.update projectInput.projectImageIds
      await this.projectImageRepository
        .createQueryBuilder('project_image')
        .update(ProjectImage)
        .set({ projectId: newProject.id })
        .where(`project_image.id IN (${projectInput.projectImageIds})`)
        .execute();
    }

    const payload: NotificationPayload = {
      id: 1,
      message: 'A new project was created',
    };
    const segmentProject = {
      email: user.email,
      title: project.title,
      lastName: user.lastName,
      firstName: user.firstName,
      OwnerId: user.id,
      slug: project.slug,
      walletAddress: project.walletAddress,
    };
    // -Mitch I'm not sure why formattedProject was added in here, the object is missing a few important pieces of
    // information into the analytics

    const formattedProject = {
      ...projectInput,
      description: projectInput?.description?.replace(/<img .*?>/g, ''),
    };
    analytics.track(
      SegmentEvents.PROJECT_CREATED,
      `givethId-${ctx.req.user.userId}`,
      segmentProject,
      null,
    );

    await pubSub.publish('NOTIFICATIONS', payload);

    if (config.get('TRIGGER_BUILD_ON_NEW_PROJECT') === 'true')
      triggerBuild(newProject.id);

    return newProject;
  }

  @Mutation(returns => ProjectUpdate)
  async addProjectUpdate(
    @Arg('projectId') projectId: number,
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectUpdate> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const owner = await User.findOne({ id: user.userId });

    if (!owner) throw new Error(errorMessages.USER_NOT_FOUND);

    const project = await Project.findOne({ id: projectId });

    if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);
    if (project.admin !== String(user.userId))
      throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);

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

    analytics.track(
      SegmentEvents.PROJECT_UPDATED_OWNER,
      `givethId-${user.userId}`,
      projectUpdateInfo,
      null,
    );

    const donations = await this.donationRepository.find({
      where: { project: { id: project?.id } },
      relations: ['user'],
    });

    const projectDonors = donations?.map(donation => {
      return donation.user;
    });
    const uniqueDonors = projectDonors?.filter((currentDonor, index) => {
      return (
        currentDonor != null &&
        projectDonors.findIndex(
          duplicateDonor => duplicateDonor.id === currentDonor.id,
        ) === index
      );
    });

    uniqueDonors?.forEach(donor => {
      const donorUpdateInfo = {
        title: project.title,
        projectId: project.id,
        projectOwnerId: project.admin,
        slug: project.slug,
        update: title,
        email: donor.email,
        firstName: donor.firstName,
      };
      analytics.track(
        SegmentEvents.PROJECT_UPDATED_DONOR,
        `givethId-${donor.id}`,
        donorUpdateInfo,
        null,
      );
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
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update) throw new Error('Project Update not found.');

    const project = await Project.findOne({ id: update.projectId });
    if (!project) throw new Error('Project not found');
    if (project.admin !== String(user.userId))
      throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);

    update.title = title;
    update.content = content;

    return update.save();
  }

  @Mutation(returns => Boolean)
  async deleteProjectUpdate(
    @Arg('updateId') updateId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<Boolean> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update) throw new Error('Project Update not found.');

    const project = await Project.findOne({ id: update.projectId });
    if (!project) throw new Error('Project not found');
    if (project.admin !== String(user.userId))
      throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);

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
    @Arg('projectId') projectId: number,
    @Arg('skip') skip: number,
    @Arg('take') take: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectUpdate[]> {
    let query = this.projectUpdateRepository
      .createQueryBuilder('projectUpdate')
      .where('projectUpdate.projectId = :projectId and isMain = false', {
        projectId,
      })
      .take(take)
      .skip(skip);

    if (user?.userId) {
      query = query.leftJoinAndMapOne(
        'project.reaction',
        Reaction,
        'reaction',
        'reaction.projectId = CAST(project.id AS INTEGER) AND reaction.userId = :authenticatedUserId',
        { authenticatedUserId: user?.userId },
      );
    }
    return query.getMany();
  }

  @Query(returns => [String])
  async getProjectsRecipients(): Promise<String[]> {
    const recipients = await Project.query(
      `
            SELECT "walletAddress" FROM project
            WHERE verified=true 
            `,
    );
    return recipients.map(({ walletAddress }) => walletAddress);
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

  @Query(returns => Project, { nullable: true })
  projectByAddress(
    @Arg('address', type => String) address: string,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .where(`lower("walletAddress")=lower(:address)`, {
        address,
      });
    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);
    return query.getOne();
  }

  @Query(returns => AllProjects, { nullable: true })
  async projectsByUserId(
    @Arg('userId', type => Int) userId: number,
    @Arg('take', { defaultValue: 10 }) take: number,
    @Arg('skip', { defaultValue: 0 }) skip: number,
    @Arg('connectedWalletUserId', type => Int, { nullable: true })
    connectedWalletUserId: number,
    @Ctx() { req: { user } }: MyContext,
  ) {
    let query = this.projectRepository
      .createQueryBuilder('project')
      .where('CAST(project.admin AS INTEGER) = :userId', { userId })
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndMapOne(
        'project.adminUser',
        User,
        'user',
        'user.id = CAST(project.admin AS INTEGER)',
      );
    // .loadRelationCountAndMap('project.liked', 'project.reactions')

    query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

    const [projects, projectsCount] = await query
      .orderBy('project.creationDate', 'DESC')
      .take(take)
      .skip(skip)
      .getManyAndCount();

    return {
      projects,
      totalCount: projectsCount,
    };
  }

  @Query(returns => AllProjects, { nullable: true })
  async likedProjectsByUserId(
    @Arg('userId', type => Int, { nullable: false }) userId: number,
    @Arg('take', type => Int, { defaultValue: 10 }) take: number,
    @Arg('skip', type => Int, { defaultValue: 0 }) skip: number,
  ) {
    const [projects, totalCount] = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoinAndMapOne(
        'project.reaction',
        Reaction,
        'reaction',
        `reaction.projectId = project.id AND reaction.userId = :userId`,
        { userId },
      )
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndMapOne(
        'project.adminUser',
        User,
        'user',
        'user.id = CAST(project.admin AS INTEGER)',
      )
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
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      throw new Error(errorMessages.PROJECT_NOT_FOUND);
    }

    project.mayUpdateStatus(user);
    const status = await ProjectStatus.findOne({ id: statusId });
    if (!status) {
      throw new Error(errorMessages.PROJECT_STATUS_NOT_FOUND);
    }
    const prevStatus = project.status;
    project.status = status;
    await project.save();

    await project.addProjectStatusHistoryRecord({
      reasonId,
      project,
      status,
      prevStatus,
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

      const segmentProject = {
        email: user.email,
        title: project.title,
        LastName: user.lastName,
        FirstName: user.firstName,
        OwnerId: project.admin,
        slug: project.slug,
      };

      analytics.track(
        SegmentEvents.PROJECT_DEACTIVATED,
        `givethId-${ctx.req.user.userId}`,
        segmentProject,
        null,
      );
      return true;
    } catch (error) {
      logger.error('projectResolver.deactivateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
      return false;
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
      const segmentProject = {
        email: user.email,
        title: project.title,
        LastName: user.lastName,
        FirstName: user.firstName,
        OwnerId: project.admin,
        slug: project.slug,
      };
      analytics.track(
        SegmentEvents.PROJECT_ACTIVATED,
        `givethId-${ctx.req.user.userId}`,
        segmentProject,
        null,
      );
      return true;
    } catch (error) {
      logger.error('projectResolver.activateProject() error', error);
      SentryLogger.captureException(error);
      throw error;
    }
  }

  private async getAppropriateSlug(slugBase: string): Promise<string> {
    let slug = slugBase.toLowerCase();
    const projectCount = await this.projectRepository
      .createQueryBuilder('project')
      // check current slug and previous slugs
      .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
        slug,
      })
      .getCount();

    if (projectCount > 0) {
      slug = slug + '-' + (projectCount - 1);
    }
    return slug;
  }
}
