import {
  Resolver,
  Query,
  FieldResolver,
  Arg,
  Root,
  Mutation,
  Ctx,
  Int
} from 'type-graphql'
import { Repository, In } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { Recipe } from '../entities/recipe'
import { OrganisationUser } from '../entities/organisationUser'
import { User } from '../entities/User'
import { RecipeInput } from './types/recipe-input'
import { Context } from '../index'
import { RateInput } from './types/rate-input'
// import { OrganisationUser } from '../entities/organisationUser'
import { Organisation } from '../entities/organisation'

@Resolver(of => User)
export class UserResolver {
  constructor (
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation> // , // @InjectRepository(OrganisationUser) // private readonly organisationUserRepository: Repository<OrganisationUser>
  ) {}

  @Query(returns => User, { nullable: true })
  user (@Arg('userId', type => Int) userId: number) {
    return this.userRepository.findOne(userId)
  }

  @Query(returns => [User])
  graphUsers (): Promise<User[]> {
    return this.userRepository.find()
  }

  @FieldResolver()
  organisationUsers (@Root() user: User) {
    return this.organisationUserRepository.find({
      cache: 1000,
      where: { authorId: user.id }
    })
  }

  // @FieldResolver()
  // async organisations (@Root() user: User) {
  //   const orgs = await this.userRepository.find({
  //     relations: ['organisations']
  //   })
  //   console.log(`orgs : ${JSON.stringify(orgs, null, 2)}`)

  //   process.exit()
  // }

  @FieldResolver()
  async organisations (@Root() user: User) {
    const organisationUsers = await this.organisationUserRepository.find({
      cache: 1000,
      where: { userId: user.id }
    })

    const organisationUserIds = organisationUsers.map(o => o.id)
    return await this.organisationRepository.find({
      cache: 1000,
      where: { organisationUserId: In(organisationUserIds) }
    })
  }
}
