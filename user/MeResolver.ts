import { Resolver, Query, Ctx, Authorized } from 'type-graphql'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { User } from '../entities/user'
import { Organisation } from '../entities/organisation'
import { Project } from '../entities/project'
// import { OrganisationProject } from '../entities/organisationProject'
import { OrganisationUser } from '../entities/organisationUser'
import { MyContext } from '../types/MyContext'

import { Repository, In } from 'typeorm'

@Resolver()
export class MeResolver {
  constructor (
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project> // @InjectRepository(OrganisationProject) // private readonly organisationProjectRepository: Repository<
  ) //   OrganisationProject
  // >
  {}

  @Authorized()
  @Query(() => User, { nullable: true, complexity: 5 })
  async me (@Ctx() ctx: MyContext): Promise<User | undefined> {
    console.log(`ctx ---> : ${ctx}`)
    // if (!ctx.req.session!.userId) {
    //   return undefined
    // }

    return User.findOne(1)
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
  async myProjects (@Ctx() ctx: MyContext): Promise<[Project] | undefined> {
    console.log('-------------- ME RESOLVER  --------------')

    if (!ctx.req.user) {
      console.log(`access denied : ${JSON.stringify(ctx.req.user, null, 2)}`)

      return undefined
    }

    console.log(`ctx.req.user.email : ${ctx.req.user.email}`)

    const user = await User.findOne({
      email: ctx.req.user.email
    })

    console.log(`user : ${JSON.stringify(user, null, 2)}`)

    // const organisationProjects = await this.organisationProjectRepository.find({
    //   cache: 1000,
    //   where: { userId: 1 }
    // })

    // const organisationProjectsIds = organisationProjects.map(o => o.id)

    // console.log(
    //   `organisationProjectsIds : ${JSON.stringify(
    //     organisationProjectsIds,
    //     null,
    //     2
    //   )}`
    // )

    return undefined

    // return await this.projectRepository.find({
    //   cache: 1000,
    //   where: { organisationProjectsId: In(organisationProjectsIds) }
    // })
    // console.log(`projects : ${JSON.stringify(projects, null, 2)}`)

    // return projects
  }
}
