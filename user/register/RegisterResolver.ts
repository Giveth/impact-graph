const bcrypt = require('bcryptjs')
import { Resolver, Query, Mutation, Arg, UseMiddleware } from 'type-graphql'

import { User } from '../../entities/user'
import { RegisterInput } from './RegisterInput'
import { isAuth } from '../../middleware/isAuth'
import { logger } from '../../middleware/logger'
import { sendEmail } from '../../utils/sendEmail'
import { createConfirmationUrl } from '../../utils/createConfirmationUrl'

@Resolver()
export class RegisterResolver {
  @UseMiddleware(isAuth, logger)
  @Query(() => String)
  async hello () {
    return 'Hello World!'
  }

  @Mutation(() => User)
  async register (
    @Arg('data')
    { email, firstName, lastName, password }: RegisterInput
  ): Promise<User> {
    console.log(`bcrypt 1 is : ${JSON.stringify(bcrypt, null, 2)}`)

    // const hashedPassword = await bcrypt.hash(password, 12)
    var hashedPassword = bcrypt.hashSync(password, 12)
    console.log(`hashedPassword ---> : ${hashedPassword}`)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword
    }).save()

    await sendEmail(email, await createConfirmationUrl(user.id))

    return user
  }
}
