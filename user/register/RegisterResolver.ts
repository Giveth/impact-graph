const bcrypt = require('bcryptjs')
import { Resolver, Query, Mutation, Arg, UseMiddleware } from 'type-graphql'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Organisation } from '../../entities/organisation'
import { OrganisationUser } from '../../entities/organisationUser'

import { User } from '../../entities/user'
import { RegisterWalletInput } from './RegisterWalletInput'
import { RegisterInput } from './RegisterInput'
// import { isAuth } from '../../middleware/isAuth'
// import { logger } from '../../middleware/logger'
import { sendEmail } from '../../utils/sendEmail'
import { createConfirmationUrl } from '../../utils/createConfirmationUrl'
import { Repository, getRepository } from 'typeorm'

@Resolver()
export class RegisterResolver {
  constructor (
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>
  ) {}

  @Mutation(() => User)
  async register (
    @Arg('data')
    { email, firstName, lastName, password }: RegisterInput
  ): Promise<User> {
    console.log(`In Register Resolver : ${JSON.stringify(bcrypt, null, 2)}`)

    // const hashedPassword = await bcrypt.hash(password, 12)
    var hashedPassword = bcrypt.hashSync(password, 12)
    console.log(`hashedPassword ---> : ${hashedPassword}`)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      loginType: 'password'
    }).save()

    await sendEmail(email, await createConfirmationUrl(user.id))

    return user
  }

  @Mutation(() => User)
  async registerWallet (
    @Arg('data')
    {
      email,
      name,
      firstName,
      lastName,
      walletAddress,
      organisationId
    }: RegisterWalletInput
  ): Promise<User> {
    const user = await User.create({
      firstName,
      lastName,
      email,
      name,
      walletAddress,
      loginType: 'wallet'
    }).save()

    console.log(`organisationId ---> : ${organisationId}`)
    if (organisationId) {
      const organisation = await this.organisationRepository.find({
        where: { id: organisationId }
      })

      if (organisation) {
        //const organisationUserRepository = getRepository(OrganisationUser)
        console.log('organisationorganisation')

        const organisationUser = this.organisationUserRepository.create({
          role: 'donor',
          organisation: organisation[0],
          user: user
        })

        const savedOrganisationUser = this.organisationUserRepository.save(
          organisationUser
        )

        console.log(`savedOrganisationUser! ---> : ${savedOrganisationUser}`)
      } else {
        throw new Error('Organisation doesnt exist')
      }
    }

    if (email) {
      await sendEmail(email, await createConfirmationUrl(user.id))
    }

    return user
  }
}
