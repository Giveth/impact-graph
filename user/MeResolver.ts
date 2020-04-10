import { Resolver, Query, Ctx } from 'type-graphql'
import { InjectRepository } from 'typeorm-typedi-extensions'

import { User } from '../entities/user'
import { Organisation } from '../entities/organisation'
import { OrganisationUser } from '../entities/organisationUser'
import { MyContext } from '../types/MyContext'

import { Repository, In } from 'typeorm'

@Resolver()
export class MeResolver {
  constructor (
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>
  ) {}

  @Query(() => User, { nullable: true, complexity: 5 })
  async me (@Ctx() ctx: MyContext): Promise<User | undefined> {
    if (!ctx.req.session!.userId) {
      return undefined
    }

    return User.findOne(ctx.req.session!.userId)
  }

  @Query(() => [Organisation], { nullable: true, complexity: 5 })
  async myOrganisations (
    @Ctx() ctx: MyContext
  ): Promise<[Organisation] | undefined> {
    if (!ctx.req.session!.userId) {
      return undefined
    }

    const userId = User.findOne(ctx.req.session!.userId)

    const organisationUsers = await this.organisationUserRepository.find({
      cache: 1000,
      where: { userId: userId }
    })

    const organisationUserIds = organisationUsers.map(o => o.id)
    return await this.organisationRepository.find({
      cache: 1000,
      where: { organisationUserId: In(organisationUserIds) }
    })
  }
}
