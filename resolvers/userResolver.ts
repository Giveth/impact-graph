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
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository, In } from 'typeorm'

import { OrganisationUser } from '../entities/organisationUser'
import { User } from '../entities/user'
import { RegisterInput } from '../user/register/RegisterInput'
import { Organisation } from '../entities/organisation'
import { MyContext } from '../types/MyContext'
import { getAnalytics } from '../analytics'

const analytics = getAnalytics()

@Resolver(of => User)
export class UserResolver {
  constructor (
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation> // , // @InjectRepository(OrganisationUser) // private readonly organisationUserRepository: Repository<OrganisationUser>
  ) {}

  async create (@Arg('data', () => RegisterInput) data: any) {
    // return User.create(data).save();
  }

  @Query(returns => User, { nullable: true })
  user (@Arg('userId', type => Int) userId: number) {
    return this.userRepository.findOne(userId)
  }

  @Query(returns => User, { nullable: true })
  userByAddress (@Arg('address', type => String) address: string) {
    return this.userRepository.findOne({ walletAddress: address })
  }

  @Mutation(returns => Boolean)
  async updateUser (
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('name', { nullable: true }) name: string,
    @Arg('url', { nullable: true }) url: string,
    @Ctx() { req: { user } }: MyContext
  ): Promise<boolean> {
    if (!user) throw new Error('Authentication required.')
    let dbUser = await User.findOne({ id: user.userId })

    if (dbUser) {
      let fullName: string = ''
      if (!name) {
        fullName = firstName + ' ' + lastName
      }
      await User.update(
        { id: user.userId },
        { firstName, lastName, name: fullName, location, email, url }
      )
      const idUser = dbUser
      idUser.firstName = firstName
      idUser.lastName = lastName
      idUser.name = fullName
      idUser.location = location
      idUser.email = email
      idUser.url = url

      const segmentUpdateProfile = {
        firstName : idUser.firstName,
        lastName : idUser.lastName,
        location : idUser.location,
        email : idUser.email,
        url : idUser.url,
      }

      analytics.identifyUser(idUser)
      analytics.track('Updated profile',  dbUser.segmentUserId(), segmentUpdateProfile, null)

      return true
    } else {
      return false
    }
  }
  // @FieldResolver()
  // organisationUsers (@Root() user: User) {
  //   return this.organisationUserRepository.find({
  //     cache: 1000,
  //     where: { authorId: user.id }
  //   })
  // }

  // @FieldResolver()
  // async organisations (@Root() user: User) {
  //   const orgs = await this.userRepository.find({
  //     relations: ['organisations']
  //   })
  //   console.log(`orgs : ${JSON.stringify(orgs, null, 2)}`)

  //   process.exit()
  // }

  // @FieldResolver()
  // async organisations (@Root() user: User) {
  //   const organisationUsers = await this.organisationUserRepository.find({
  //     cache: 1000,
  //     where: { userId: user.id }
  //   })

  //   const organisationUserIds = organisationUsers.map(o => o.id)
  //   return await this.organisationRepository.find({
  //     cache: 1000,
  //     where: { organisationUserId: In(organisationUserIds) }
  //   })
  // }
}
