import { Resolver, Query, Ctx, Authorized } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { User } from '../entities/user';
import { Organisation } from '../entities/organisation';
import { Project } from '../entities/project';
import { OrganisationUser } from '../entities/organisationUser';
import { MyContext } from '../types/MyContext';
import { Repository, In } from 'typeorm';
import SentryLogger from '../sentryLogger';
import { logger } from '../utils/logger';

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
    SentryLogger.captureMessage(errorMessage);
    logger.error(
      `Non-existant userToken for userId ${ctx.req.user.userId}. Token is ${ctx.req.user.token}`,
    );
    throw new Error(userMessage);
  }

  return user;
}

@Resolver()
export class MeResolver {
  constructor(
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>, // @InjectRepository(OrganisationProject) // private readonly organisationProjectRepository: Repository< //   OrganisationProject // >
  ) {}

  @Authorized()
  @Query(() => User, { nullable: true, complexity: 5 })
  async me(@Ctx() ctx: MyContext): Promise<User | undefined> {
    const user = await getLoggedInUser(ctx);

    return user;
  }

  // @Query(() => [Organisation], { nullable: true, complexity: 5 })
  // async myOrganisations (
  //   @Ctx() ctx: MyContext
  // ): Promise<[Organisation] | undefined> {
  //   const userId = await User.findOne(ctx.req.user.x)

  //   const organisationUsers = await this.organisationUserRepository.find({
  //     cache: 1000,
  //     where: { userId: userId }
  //   })

  //   const organisationUserIds = organisationUsers.map(o => o.id)

  //   return undefined
  //   // return await this.organisationRepository.find({
  //   //   cache: 1000,
  //   //   where: { organisationUserId: In(organisationUserIds) }
  //   // })
  // }

  // @Authorized()
  @Query(() => [Project], { nullable: true, complexity: 5 })
  async myProjects(@Ctx() ctx: MyContext): Promise<Project[] | undefined> {
    const user = await getLoggedInUser(ctx);

    const projects = this.projectRepository.find({
      where: { admin: user.id?.toString() },
      // relations: ['status', 'donations', 'reactions'],
      relations: ['status', 'reactions'],
      order: {
        qualityScore: 'DESC',
      },
    });

    return projects;
  }
}
