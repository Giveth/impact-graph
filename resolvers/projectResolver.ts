import { PubSubEngine } from 'graphql-subscriptions'
import { InjectRepository } from 'typeorm-typedi-extensions'
import NotificationPayload from '../entities/notificationPayload'

import {
  Resolver,
  FieldResolver,
  Root,
  Ctx,
  Query,
  Arg,
  Mutation,
  Args,
  PubSub,
  ArgsType,
  Field,
  Int
} from 'type-graphql'
import { Min, Max } from 'class-validator'

import { Project } from '../entities/project'
import { User } from '../entities/user'
import { Repository } from 'typeorm'

import { ProjectInput } from './types/project-input'
import { Context } from '../Context'
import { OrganisationProject } from '../entities/organisationProject'
// import { ProjectsArguments } from "./types/projects-arguments";
// import { generateProjects } from "../helpers";

@ArgsType()
class GetProjectsArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number

  @Field(type => Int, { defaultValue: 25 })
  @Min(1)
  @Max(50)
  take: number
}

@Resolver(of => Project)
export class ProjectResolver {
  constructor (
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OrganisationProject)
    private readonly organisationProject: Repository<OrganisationProject>
  ) {}

  // @FieldResolver()
  // async author(@Root() project: Project): Promise<User> {
  //   return (await this.userRepository.findOne(project.authorId, { cache: 1000 }))!;
  // }

  // private readonly items: Project[] = generateProjects(100);

  // @Query(returns => [Project])
  // async projects(@Args() { skip, take }: ProjectsArguments): Promise<Project[]> {
  //   const start: number = skip;
  //   const end: number = skip + take;
  //   return await this.items.slice(start, end);
  // }

  @Query(returns => [Project])
  async projects (@Args() { take, skip }: GetProjectsArgs): Promise<Project[]> {
    return this.projectRepository.find({ take, skip })
  }

  @Mutation(returns => Project)
  async addProject (
    @Arg('project') projectInput: ProjectInput,
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...projectInput
      // ...projectInput,
      // authorId: user.id
    })
    const newProject = await this.projectRepository.save(project)

    const organisationProject = this.organisationProject.create({
      organisationId: projectInput.organisationId,
      projectId: newProject.id
    })
    const newOrganisationProject = await this.organisationProject.save(
      organisationProject
    )

    const payload: NotificationPayload = {
      id: 1,
      message: 'A new project was created'
    }

    await pubSub.publish('NOTIFICATIONS', payload)

    return newProject
  }

  @Mutation(returns => Project)
  async addProjectSimple (
    @Arg('title') title: string,
    @Arg('description') description: string,
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<Project> {
    const projectInput = new ProjectInput()
    projectInput.title = title
    projectInput.description = description
    const project = this.projectRepository.create({
      ...projectInput
      //   // ...projectInput,
      //   // authorId: user.id
    })
    const newProject = await this.projectRepository.save(project)
    //await AuthorBook.create({ authorId, bookId }).save();
    const payload: NotificationPayload = {
      id: 1,
      message: 'A new project was created'
    }

    await pubSub.publish('NOTIFICATIONS', payload)

    return newProject
  }
  // @Mutation(returns => Project)
  // async addProject(@Arg("input") projectInput: ProjectInput): Promise<Project> {
  //   const project = new Project();
  //   project.description = projectInput.description;
  //   project.title = projectInput.title;
  //   project.creationDate = new Date();

  //   await this.items.push(project);
  //   return project;
  // }
}
