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
import { User } from '../entities/user'
import { Project } from '../entities/project'
import { Repository, In } from 'typeorm'

import { Context } from '../index'
import { OrganisationUser } from '../entities/organisationUser'

@Resolver(of => Organisation)
export class OrganisationResolver {
  constructor (
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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
  graphOrganisations (): Promise<Organisation[]> {
    return this.organisationRepository.find()
  }
}
