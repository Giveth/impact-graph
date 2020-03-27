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
import { Repository } from 'typeorm'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { Recipe } from '../entities/recipe'
import { Rate } from '../entities/rate'
import { User } from '../entities/user'
import { RecipeInput } from './types/recipe-input'
import { Context } from '../index'
import { RateInput } from './types/rate-input'
import { OrganisationUser } from '../entities/organisationUser'

@Resolver(of => User)
export class UserResolver {
  constructor (
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>
  ) {}

  @Query(returns => User, { nullable: true })
  user (@Arg('userId', type => Int) userId: number) {
    return this.userRepository.findOne(userId)
  }

  @Query(returns => [User])
  users (): Promise<User[]> {
    return this.userRepository.find()
  }

  @FieldResolver()
  organisationUsers (@Root() user: User) {
    return this.organisationUserRepository.find({
      cache: 1000,
      where: { authorId: user.id }
    })
  }
}
