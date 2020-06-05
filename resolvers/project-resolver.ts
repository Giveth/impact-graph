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
  PubSub
} from 'type-graphql'

import { Project } from '../entities/project'
import { User } from '../entities/user'
import { Repository } from 'typeorm'

import { ProjectInput } from './types/project-input'
import { Context } from '../index'
// import { ProjectsArguments } from "./types/projects-arguments";
// import { generateProjects } from "../helpers";

@Resolver(of => Project)
export class ProjectResolver {
  constructor (
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User) private readonly userRepository: Repository<User>
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
  async projects (): Promise<Project[]> {
    return this.projectRepository.find()
  }

  @Mutation(returns => Project)
  async addProject (
    @Arg('project') projectInput: ProjectInput,
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<Project> {
    console.log('Add project mutation')

    const project = this.projectRepository.create({
      ...projectInput
      // ...projectInput,
      // authorId: user.id
    })
    const newProject = await this.projectRepository.save(project)

    const payload: NotificationPayload = {
      id: 1,
      message: 'A new project was created'
    }
    console.log(`payload : ${JSON.stringify(payload, null, 2)}`)

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
    console.log(`payload : ${JSON.stringify(payload, null, 2)}`)

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
