import { InjectRepository } from 'typeorm-typedi-extensions';

import {
  Resolver,
  FieldResolver,
  Root,
  Ctx,
  Query,
  Arg,
  Mutation,
  Args,
} from 'type-graphql';

import { Organisation } from '../entities/organisation';
import { OrganisationX } from '../entities/organisationX';
// import { OrganisationProject } from '../entities/organisationProject'
import { OrganisationUser } from '../entities/organisationUser';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { Repository, In, getManager } from 'typeorm';
import { MyContext } from '../types/MyContext';
import { Service } from 'typedi';

@Service()
@Resolver(of => OrganisationX)
export class OrganisationResolver {
  constructor(
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,
  ) {}

  // @FieldResolver()
  // organisationProjects (@Root() organisation: Organisation) {
  //   return this.organisationProjectRepository.find({
  //     cache: 1000,
  //     where: { organisationId: organisation.id }
  //   })
  // }

  @FieldResolver()
  async projects(@Root() organisation: Organisation) {
    // const ops = await this.organisationProjectRepository.find({
    //   cache: 1000,
    //   where: { organisationId: organisation.id }
    // })
    // const ids = ops.map(o => o.id)
    // return await this.projectRepository.find({
    //   cache: 1000,
    //   where: { organisationProjectId: In(ids) }
    // })
  }

  // @Query(returns => [Organisation])
  // async organisationsFromUserId (
  //   @Arg('userId') userId: number
  // ): Promise<Organisation[]> {
  //   // const organisationUsers = await this.organisationUserRepository.find({
  //   //   cache: 1000,
  //   //   where: { userId: userId }
  //   // })

  //   // const organisationUserIds = organisationUsers.map(o => o.id)
  //   // return await this.organisationRepository.find({
  //   //   cache: 1000,
  //   //   where: { organisationUserId: In(organisationUserIds) }
  //   // })
  //   // return this.organisationRepository.find()
  // }

  @Query(returns => [Project])
  async organisationProjects(
    @Arg('organisationId') organisationId: number,
    @Ctx() ctx: MyContext,
  ): Promise<Project[]> {
    console.log(`organisationId ---> : ${organisationId}`);

    if (!ctx.req.user) {
      console.log(`access denied : ${JSON.stringify(ctx.req.user, null, 2)}`);
      throw new Error('Access denied');
      // return undefined
    }

    console.log(`ctx.req.user.email : ${ctx.req.user.email}`);
    // const organisations = await this.organisationRepository
    //   .createQueryBuilder('organisation')
    //   .leftJoinAndSelect('organisation.projects', 'projects')
    //   .where({ id: organisationId })
    //   .getMany()
    const organisations = await this.organisationRepository.find({
      relations: ['projects'],
      where: { id: organisationId },
    });

    console.log(
      `organisations ---> : ${JSON.stringify(
        organisations[0].projects,
        null,
        2,
      )}`,
    );

    return organisations[0].projects;
  }

  @Query(returns => [OrganisationX])
  async organisationById(
    @Arg('organisationId') organisationId: number,
  ): Promise<OrganisationX[]> {
    console.log(`organisationId ---> : ${organisationId}`);
    // const organisations = await this.organisationRepository
    //   .createQueryBuilder('organisation')
    //   .leftJoinAndSelect('organisation.projects', 'projects')
    //   .where({ id: organisationId })
    //   .getMany()
    const organisations = await this.organisationRepository.find({
      relations: ['projects'],
      where: { id: organisationId },
    });
    console.log(`organisations ---> : ${organisations[0].projects}`);
    console.log(`organisations : ${JSON.stringify(organisations, null, 2)}`);

    const OrganisationXs: any = organisations.map(o => {
      const x = new OrganisationX();
      x.title = o.title;
      x.description = o.description;
      x.projects = ['1', '2', '3'];
      return x;
    });

    console.log(`OrganisationXs : ${JSON.stringify(OrganisationXs, null, 2)}`);

    // organisations = organisations.map(o => {
    //   return {
    //     ...o,
    //     projectz: o.projects
    //   }
    // })

    // const organisations = await this.organisationRepository.find({
    //   join: {
    //     alias: 'projects',
    //     leftJoinAndSelect: {
    //       title: 'projects.profile'
    //     }
    //   },
    //   where: { id: organisationId }
    // })

    // const organisationProjects = await this.organisationRepository.find({
    //   relations: ['organisationProjects'],
    //   where: { id: organisationId }
    // })

    return OrganisationXs;
  }

  @Query(returns => [Organisation])
  organisations(): Promise<Organisation[]> {
    return this.organisationRepository.find();
  }
}
