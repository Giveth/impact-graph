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
import { getAnalytics, SegmentEvents } from '../analytics';
import { Max, Min } from 'class-validator';
import { User } from '../entities/user';
import { Context } from '../context';
import { Repository } from 'typeorm';
import { Service } from 'typedi';
import config from '../config';
import slugify from 'slugify';
import Logger from '../logger';
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
  isWalletAddressSmartContract,
  validateProjectTitle,
  validateProjectTitleForEdit,
  validateProjectWalletAddress,
} from '../utils/validators/projectValidator';
import { updateTotalReactionsOfAProject } from '../services/reactionsService';
import { dispatchProjectUpdateEvent } from '../services/trace/traceService';

const analytics = getAnalytics();

@ObjectType()
class AllProjects {
  @Field(type => [Project])
  projects: Project[];

  @Field(type => Int)
  totalCount: number;

  @Field(type => [Category])
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
    throw new Error('Access denied');
  }
}
async function getLoggedInUser(ctx: MyContext) {
  checkIfUserInRequest(ctx);

  const user = await User.findOne({ id: ctx.req.user.userId });

  if (!user) {
    const errorMessage = `No user with userId ${ctx.req.user.userId} found. This userId comes from the token. Please check the pm2 logs for the token. Search for 'Non-existant userToken' to see the token`;
    const userMessage = 'Access denied';
    Logger.captureMessage(errorMessage);
    console.error(
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

  @Field(type => Int, { defaultValue: 0 })
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

  @Field(type => [Reaction])
  reactions: Reaction[];
}

@ObjectType()
class ToggleResponse {
  @Field(type => Boolean)
  reaction: boolean;

  @Field(type => Number)
  reactionCount: number;
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
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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
    }: GetProjectsArgs,
  ): Promise<AllProjects> {
    const categories = await Category.find();
    const [projects, totalCount] = await Project.searchProjects(
      take,
      skip,
      orderBy.field,
      orderBy.direction,
      category,
      searchTerm,
      filterBy?.field,
      filterBy?.value,
    );

    return { projects, totalCount, categories };
  }

  @Query(returns => TopProjects)
  async topProjects(
    @Args() { take, skip, orderBy, category }: GetProjectsArgs,
  ): Promise<TopProjects> {
    const { field, direction } = orderBy;
    const order = {};
    order[field] = direction;

    let projects;
    let totalCount;

    if (!category) {
      [projects, totalCount] = await this.projectRepository.findAndCount({
        take,
        skip,
        order,
        relations: ['reactions'],
        where: {
          status: {
            id: ProjStatus.active,
          },
        },
      });
    } else {
      [projects, totalCount] = await this.projectRepository
        .createQueryBuilder('project')
        .innerJoin(
          'project.categories',
          'category',
          'category.name = :category',
          { category },
        )
        .innerJoin('project.reactions', 'reaction')
        .where('project.statusId = 5 AND project.listed = true')
        .orderBy(`project.${field}`, direction)
        .limit(skip)
        .take(take)
        .innerJoinAndSelect('project.categories', 'c')
        .getManyAndCount();
    }
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
      relations: ['donations', 'reactions'],
    });
  }

  // Move this to it's own resolver later
  @Query(returns => Project)
  async projectBySlug(@Arg('slug') slug: string) {
    return await this.projectRepository
      .createQueryBuilder('project')
      // check current slug and previous slugs
      .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
        slug,
      })
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.categories', 'categories')
      .leftJoinAndSelect('project.reactions', 'reactions')
      .leftJoinAndMapOne('project.adminUser', User, "user", "user.id = CAST(project.admin AS INTEGER)")
      .getOne();
  }

  @Mutation(returns => Project)
  async editProject(
    @Arg('projectId') projectId: number,
    @Arg('newProjectData') newProjectData: ProjectInput,
    @Ctx() { req: { user } }: MyContext,
  ) {
    if (!user) throw new Error('Authentication required.');

    const project = await Project.findOne({ id: projectId });

    if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);
    console.log(`project.admin ---> : ${project.admin}`);
    console.log(`user.userId ---> : ${user.userId}`);
    if (project.admin !== String(user.userId))
      throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);

    for (const field in newProjectData) project[field] = newProjectData[field];

    if (newProjectData.categories) {
      const categoriesPromise = newProjectData.categories.map(
        async category => {
          let [c] = await this.categoryRepository.find({ name: category });
          if (c === undefined) {
            c = new Category();
            c.name = category;
          }
          return c;
        },
      );

      const categories = await Promise.all(categoriesPromise);
      if (categories.length > 5) {
        throw new Error(
          errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
        );
      }
      project.categories = categories;
    }
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
        console.error(e);
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

    const slugBase = slugify(newProjectData.title);
    const newSlug = await this.getAppropriateSlug(slugBase);
    if (project.slug !== newSlug && !project.slugHistory?.includes(newSlug)) {
      // it's just needed for editProject, we dont add current slug in slugHistory so it's not needed to do this in addProject
      project.slugHistory?.push(project.slug as string);
    }
    project.slug = newSlug;
    project.qualityScore = qualityScore;
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
        console.log(`response : ${JSON.stringify(response, null, 2)}`);

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

    const categoriesPromise = Promise.all(
      projectInput.categories
        ? projectInput.categories.map(async category => {
            let [c] = await this.categoryRepository.find({ name: category });
            if (c === undefined) {
              c = new Category();
              c.name = category;
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
        console.error(e);
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
    await validateProjectWalletAddress(projectInput.walletAddress as string);
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
      verified: false,
      giveBacks: false,
      listed: false,
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

    console.log(
      `projectInput.projectImageIds : ${JSON.stringify(
        projectInput.projectImageIds,
        null,
        2,
      )}`,
    );

    // Associate already uploaded images:
    if (projectInput.projectImageIds) {
      console.log(
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
    if (!user) throw new Error('Authentication required.');

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
    if (!user) throw new Error('Authentication required.');

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
    if (!user) throw new Error('Authentication required.');

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
    return true;
  }

  @Mutation(returns => Boolean)
  async toggleReaction(
    @Arg('updateId') updateId: number,
    @Arg('reaction') reaction: REACTION_TYPE = 'heart',
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user) throw new Error('Authentication required.');

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update) throw new Error('Update not found.');

    // if there is one, then delete it
    const currentReaction = await Reaction.findOne({
      projectUpdateId: update.id,
      userId: user.userId,
    });

    const project = await Project.findOne({ id: update.projectId });
    if (!project) throw new Error('Project not found');

    if (currentReaction && currentReaction.reaction === reaction) {
      await Reaction.delete({
        projectUpdateId: update.id,
        userId: user.userId,
      });

      // increment qualityScore
      project.updateQualityScoreHeart(false);
      project.save();
      return false;
    } else {
      // if there wasn't one, then create it
      const newReaction = await Reaction.create({
        userId: user.userId,
        projectUpdateId: update.id,
        reaction,
      });

      project.updateQualityScoreHeart(true);
      project.save();

      await Reaction.save(newReaction);
    }
    await updateTotalReactionsOfAProject(update.projectId);

    return true;
  }

  @Mutation(returns => ToggleResponse)
  async toggleProjectReaction(
    @Arg('projectId') projectId: number,
    @Arg('reaction') reaction: REACTION_TYPE = 'heart',
    @Ctx() { req: { user } }: MyContext,
  ): Promise<object> {
    if (!user) throw new Error('Authentication required.');

    const project = await Project.findOne({ id: projectId });

    if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);

    let update = await ProjectUpdate.findOne({ projectId, isMain: true });
    if (!update) {
      update = await ProjectUpdate.save(
        await ProjectUpdate.create({
          userId:
            project && project.admin && +project.admin ? +project.admin : 0,
          projectId,
          content: '',
          title: '',
          createdAt: new Date(),
          isMain: true,
        }),
      );
    }

    const usersReaction = await Reaction.findOne({
      projectUpdateId: update.id,
      userId: user.userId,
    });
    const [, reactionCount] = await Reaction.findAndCount({
      projectUpdateId: update.id,
    });

    await Reaction.delete({ projectUpdateId: update.id, userId: user.userId });
    const response = new ToggleResponse();
    response.reactionCount = reactionCount;

    if (usersReaction && usersReaction.reaction === reaction) {
      response.reaction = false;
      response.reactionCount = response.reactionCount - 1;
    } else {
      const newReaction = await Reaction.create({
        userId: user.userId,
        projectUpdateId: update.id,
        reaction,
        project,
      });

      await Reaction.save(newReaction);
      response.reactionCount = response.reactionCount + 1;
      response.reaction = true;
    }
    await updateTotalReactionsOfAProject(projectId);
    return response;
  }

  @Query(returns => [GetProjectUpdatesResult])
  async getProjectUpdates(
    @Arg('projectId') projectId: number,
    @Arg('skip') skip: number,
    @Arg('take') take: number,
    @Ctx() { user }: Context,
  ): Promise<GetProjectUpdatesResult[]> {
    const updates = await ProjectUpdate.find({
      where: { projectId, isMain: false },
      skip,
      take,
    });

    const results: GetProjectUpdatesResult[] = [];

    for (const update of updates)
      results.push({
        projectUpdate: update,
        reactions: await Reaction.find({
          where: { projectUpdateId: update.id },
        }),
      });

    return results;
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

  @Query(returns => Boolean)
  async isWalletSmartContract(@Arg('address') address: string) {
    return isWalletAddressSmartContract(address);
  }

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
  projectByAddress(@Arg('address', type => String) address: string) {
    return this.projectRepository
      .createQueryBuilder('project')
      .where(`lower("walletAddress")=lower(:address)`, {
        address,
      })
      .getOne();
  }

  async updateProjectStatus(
    projectId: number,
    status: number,
    user: User,
  ): Promise<Boolean> {
    const project = await Project.findOne({ id: projectId });

    if (project) {
      if (project.mayUpdateStatus(user)) {
        const projectStatus = await ProjectStatus.findOne({ id: status });
        if (projectStatus) {
          project.status = projectStatus;
          await project.save();
          return true;
        } else {
          throw new Error('No project status found, this should be impossible');
        }
      } else {
        throw new Error(
          'User does not have permission to update status on that project',
        );
      }
    } else {
      throw new Error('You tried to deactivate a non existant project');
    }
  }

  @Mutation(returns => Boolean)
  async deactivateProject(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: MyContext,
  ): Promise<Boolean> {
    try {
      const user = await getLoggedInUser(ctx);
      const didDeactivate = await this.updateProjectStatus(
        projectId,
        ProjStatus.deactive,
        user,
      );
      if (didDeactivate) {
        const project = await Project.findOne({ id: projectId });
        if (project) {
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
        }
      }
      return didDeactivate;
    } catch (error) {
      Logger.captureException(error);
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
      return await this.updateProjectStatus(projectId, ProjStatus.active, user);
    } catch (error) {
      Logger.captureException(error);
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
      slug = slugBase + '-' + (projectCount - 1);
    }
    return slug;
  }
}
