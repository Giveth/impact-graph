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

// import { OrganisationInput } from './types/project-input'
import { Context } from '../index'
import { OrganisationUser } from '../entities/organisationUser'
// import { OrganisationsArguments } from "./types/projects-arguments";
// import { generateOrganisations } from "../helpers";

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

  // @FieldResolver()
  // async author (@Root() organisation: Organisation): Promise<User> {
  //   return (await this.userRepository.findOne(organisation.authorId, {
  //     cache: 1000
  //   }))!
  // }

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
    // const projects = ops.map(
    //   async op =>
    //     await this.projectRepository.find({
    //       cache: 1000,
    //       where: { organisationProjectId: op.id }
    //     })
    // )

    const ids = ops.map(o => o.id)
    return await this.projectRepository.find({
      cache: 1000,
      where: { organisationProjectId: In(ids) }
    })
  }

  // @FieldResolver()
  // async organisationProjects (): Promise<OrganisationProject> {
  //   const ops = await this.organisationProjectRepository.findAll()

  //   console.log(`ops : ${JSON.stringify(ops, null, 2)}`)

  //   // console.log(
  //   //   `this.organisationRepository123 : ${JSON.stringify(
  //   //     this.organisationRepository,
  //   //     null,
  //   //     2
  //   //   )}`
  //   // )
  //   // return this.organisationProjectRepository.find()
  // }

  // private readonly items: Organisation[] = generateOrganisations(100);

  // @Query(returns => [Organisation])
  // async organisations(@Args() { skip, take }: OrganisationsArguments): Promise<Organisation[]> {
  //   const start: number = skip;
  //   const end: number = skip + take;
  //   return await this.items.slice(start, end);
  // }

  @Query(returns => [Organisation])
  organisations (): Promise<Organisation[]> {
    return this.organisationRepository.find()
  }

  // @Mutation(returns => Organisation)
  // async addOrganisation (
  //   @Arg('organisation') organisationInput: OrganisationInput,
  //   @Ctx() { user }: Context
  // ): Promise<Organisation> {
  //   const organisation = this.organisationRepository.create({
  //     ...organisationInput,
  //     authorId: user.id
  //   })
  //   return await this.organisationRepository.save(organisation)
  // }
  // @Mutation(returns => Organisation)
  // async addOrganisation(@Arg("input") organisationInput: OrganisationInput): Promise<Organisation> {
  //   const organisation = new Organisation();
  //   organisation.description = organisationInput.description;
  //   organisation.title = organisationInput.title;
  //   organisation.creationDate = new Date();

  //   await this.items.push(organisation);
  //   return organisation;
  // }
}
