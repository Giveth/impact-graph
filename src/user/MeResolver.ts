import { Resolver, Query, Ctx, Authorized } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';

import { User } from '../entities/user';
import { Project } from '../entities/project';
import { MyContext } from '../types/MyContext';
import { Repository, In } from 'typeorm';
import { getLoggedInUser } from '../services/authorizationServices';

@Resolver()
export class MeResolver {
  constructor(
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
