import { Resolver, Query, Ctx, Authorized } from 'type-graphql';

import { Repository } from 'typeorm';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { ApolloContext } from '../types/ApolloContext';
import { getLoggedInUser } from '../services/authorizationServices';
import { AppDataSource } from '../orm';

@Resolver()
export class MeResolver {
  constructor(
    private readonly projectRepository: Repository<Project>, // @InjectRepository(OrganisationProject) // private readonly organisationProjectRepository: Repository< //   OrganisationProject // >
  ) {
    this.projectRepository =
      AppDataSource.getDataSource().getRepository(Project);
  }

  @Authorized()
  @Query(() => User, { nullable: true, complexity: 5 })
  async me(@Ctx() ctx: ApolloContext): Promise<User | undefined> {
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
  async myProjects(@Ctx() ctx: ApolloContext): Promise<Project[] | undefined> {
    const user = await getLoggedInUser(ctx);

    const projects = this.projectRepository.find({
      where: { adminUserId: user.id },
      // relations: ['status', 'donations', 'reactions'],
      relations: ['status', 'reactions'],
      order: {
        qualityScore: 'DESC',
      },
    });

    return projects;
  }
}
