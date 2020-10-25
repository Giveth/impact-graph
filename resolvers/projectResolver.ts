import { PubSubEngine } from 'graphql-subscriptions'
import { Service } from 'typedi'
import { InjectRepository } from 'typeorm-typedi-extensions'
import NotificationPayload from '../entities/notificationPayload'
import { MyContext } from '../types/MyContext'
import { UserPermissions } from '../permissions'

import {
  Resolver,
  Ctx,
  Query,
  Arg,
  Mutation,
  Args,
  PubSub,
  ArgsType,
  Field,
  Int,
  ID,
  ObjectType,
  registerEnumType, InputType,
} from 'type-graphql'
import { Min, Max } from 'class-validator'

import { Category, Project } from '../entities/project'
import { User } from '../entities/user'
import { Repository } from 'typeorm'

import { ProjectInput } from './types/project-input'
import { Context } from '../Context'
// import { OrganisationProject } from '../entities/organisationProject'
// import { ProjectsArguments } from "./types/projects-arguments";
// import { generateProjects } from "../helpers";

@ObjectType()
class TopProjects {
  @Field(type => [Project])
  projects: Project[]

  @Field(type => Int)
  totalCount: number
}

enum OrderField {
  CreationDate = 'creationDate',
  Balance = 'balance',
}

enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC'
}

registerEnumType(OrderField, {
  name: 'OrderField',
  description: 'Order by field'
})

registerEnumType(OrderDirection, {
  name: 'OrderDirection',
  description: 'Order direction'
})

@InputType()
class OrderBy {
  @Field(type => OrderField)
  field: OrderField

  @Field(type => OrderDirection)
  direction: OrderDirection
}

@Service()
@ArgsType()
class GetProjectsArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
   skip: number

  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  @Max(50)
  take: number

  @Field(type => OrderBy, { defaultValue: { field: OrderField.Balance, direction: OrderDirection.DESC } })
  orderBy: OrderBy

  @Field({ nullable: true })
  category: string
}

@Service()
@ArgsType()
class GetProjectArgs {
  @Field(type => ID!, { defaultValue: 0 })
  id: number
}

@Resolver(of => Project)
export class ProjectResolver {
  constructor (
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private userPermissions: UserPermissions
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

  @Query(returns => TopProjects)
  async topProjects (@Args() { take, skip, orderBy, category }: GetProjectsArgs): Promise<TopProjects> {
    const { field, direction } = orderBy
    const order = {};
    order[field] = direction;

    let projects;
    let totalCount;

    if (!category) {
      [projects, totalCount] = await this.projectRepository.findAndCount({ take, skip, order })
    } else {
      [projects, totalCount] = await this.projectRepository
          .createQueryBuilder('project')
          .innerJoin('project.categories', 'category', 'category.name = :category', { category })
          .orderBy(`project.${field}`, direction)
          .limit(skip)
          .take(take)
          .innerJoinAndSelect('project.categories', 'c')
          .getManyAndCount()
    }
    return { projects, totalCount };
  }

  @Query(returns => [Project])
  async project (@Args() { id }: GetProjectArgs): Promise<Project[]> {
    return this.projectRepository.find({ id })
  }

  @Query(returns => Project)
  async projectBySlug (@Arg("slug") slug: string) {
    return this.projectRepository.findOne({ slug })
  }

  @Mutation(returns => Project)
  async addProject (
    @Arg( 'project') projectInput: ProjectInput,
    @Ctx() ctx: MyContext,
    @PubSub() pubSub: PubSubEngine
  ): Promise<Project> {
    // AUTH CHECK

    // if (!ctx.req.user) {
    //   console.log(`access denied : ${JSON.stringify(ctx.req.user, null, 2)}`)
    //   throw new Error('Access denied')
    //   // return undefined
    // }
    // console.log(`Add project user email: ${ctx.req.user.email}`)
    // if (!ctx.req.user) {
    //   console.log(`access denied : ${JSON.stringify(ctx.req.user, null, 2)}`)
    //   throw new Error('Access denied')
    //   // return undefined
    // }

    // THIS CHECKS PERMISSIONS ON A BASIC AUTH FLOW

    // if (
    //   await this.userPermissions.mayAddProjectToOrganisation(
    //     ctx.req.user.email,
    //     projectInput.organisationId
    //   )
    // ) {

      const categories = await Promise.all(projectInput.categories ?
        projectInput.categories.map(async category => {
          let [c] = await this.categoryRepository.find({ name: category });
          if (c === undefined) {
            c = new Category();
            c.name = category;
          }
          return c;
        }) : []);

      var slug = projectInput.title.toLowerCase().replace(/ /g, "-").replace(/[^a-zA-Z0-9]/g, "");
      for (let i=1;await this.projectRepository.findOne({ slug });i++) slug = projectInput.title.toLowerCase().replace(/ /g, "-").replace(/[^a-zA-Z0-9]/g, "") + "-" + i;

      const project = this.projectRepository.create({
        ...projectInput,
        categories,
        slug
        // ...projectInput,
        // authorId: user.id
      })
      const newProject = await this.projectRepository.save(project)

      // const organisationProject = this.organisationProject.create({
      //   organisationId: projectInput.organisationId,
      //   projectId: newProject.id
      // })
      // const newOrganisationProject = await this.organisationProject.save(
      //   organisationProject
      // )

      const payload: NotificationPayload = {
        id: 1,
        message: 'A new project was created'
      }

      await pubSub.publish('NOTIFICATIONS', payload)

      return newProject
    // } else {
    //   throw new Error(
    //     'User does not have the right to create a project for this organisation'
    //   )
    // }

    // await pubSub.publish('NOTIFICATIONS', payload)

    // return newProject
    // if (
    //     await this.userPermissions.mayAddProjectToOrganisation(
    //     ctx.req.user.email,
    //     projectInput.organisationId
    //   )
    // ) {
    //   const project = this.projectRepository.create({
    //     ...projectInput
    //     // ...projectInput,
    //     // authorId: user.id
    //   })
    //   const newProject = await this.projectRepository.save(project)
    //
    //   // const organisationProject = this.organisationProject.create({
    //   //   organisationId: projectInput.organisationId,
    //   //   projectId: newProject.id
    //   // })
    //   // const newOrganisationProject = await this.organisationProject.save(
    //   //   organisationProject
    //   // )
    //
    //   const payload: NotificationPayload = {
    //     id: 1,
    //     message: 'A new project was created'
    //   }
    //
    //   await pubSub.publish('NOTIFICATIONS', payload)
    //
    //   return newProject
    // } else {
    //   throw new Error(
    //     'User does not have the right to create a project for this organisation'
    //   )
    // }
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

    var slug = projectInput.title.toLowerCase().replace(/ /g, "-").replace(/[^a-zA-Z0-9]/g, "");
    for (let i=1;await this.projectRepository.findOne({ slug });i++) slug = projectInput.title.toLowerCase().replace(/ /g, "-").replace(/[^a-zA-Z0-9]/g, "") + "-" + i;

    const project = this.projectRepository.create({
      ...projectInput,
      slug,
      categories: [],
      //   // ...projectInput,
      //   // authorId: user.id
    })
    const newProject = await this.projectRepository.save(project)
    // await AuthorBook.create({ authorId, bookId }).save();
    const payload: NotificationPayload = {
      id: 1,
      message: 'A new project was created'
    }

    await pubSub.publish('NOTIFICATIONS', payload)

    return newProject
  }
}
