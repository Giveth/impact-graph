import { InjectRepository } from 'typeorm-typedi-extensions'

import {
  Resolver,
  FieldResolver,
  Root,
  Ctx,
  Query,
  Arg,
  Mutation,
  Args
} from 'type-graphql'

import { Organisation } from '../entities/organisation'
import { OrganisationProject } from '../entities/organisationProject'
import { OrganisationUser } from '../entities/organisationUser'
import { User } from '../entities/user'
import { Project } from '../entities/project'
import { Repository, In } from 'typeorm'

import { Context } from '../index'

@Resolver(of => Organisation)
export class OrganisationResolver {
  constructor (
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(OrganisationProject)
    private readonly organisationProjectRepository: Repository<
      OrganisationProject
    >
  ) {}

  @FieldResolver()
  organisationProjects (@Root() organisation: Organisation) {
    return this.organisationProjectRepository.find({
      cache: 1000,
      where: { organisationId: organisation.id }
    })
  }

  @FieldResolver()
  async projects (@Root() organisation: Organisation) {
    const ops = await this.organisationProjectRepository.find({
      cache: 1000,
      where: { organisationId: organisation.id }
    })

    const ids = ops.map(o => o.id)
    return await this.projectRepository.find({
      cache: 1000,
      where: { organisationProjectId: In(ids) }
    })
  }

  @Query(returns => [Organisation])
  async organisationsFromUserId (
    @Arg('userId') userId: number
  ): Promise<Organisation[]> {
    const organisationUsers = await this.organisationUserRepository.find({
      cache: 1000,
      where: { userId }
    })

    const organisationUserIds = organisationUsers.map(o => o.id)
    return await this.organisationRepository.find({
      cache: 1000,
      where: { organisationUserId: In(organisationUserIds) }
    })
    return this.organisationRepository.find()
  }

  @Query(returns => [Organisation])
  organisations (): Promise<Organisation[]> {
    return this.organisationRepository.find()
  }
}
