import bcrypt from 'bcryptjs'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { User } from '../entities/user'
import { MyContext } from '../types/MyContext'

@Resolver()
export class LoginResolver {
  @Mutation(() => User, { nullable: true })
  async login (
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() ctx: MyContext
  ): Promise<User | null> {
    console.log('Finding user with email ' + email)

    const user = await User.findOne({ where: { email } })

    if (!user) {
      console.log('no user')

      return null
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      console.log('Not valid')

      return null
    }

    if (!user.confirmed) {
      console.log('not confirmed')

      return null
    }

    console.log(`successfully logged in`)
    ctx.req.session!.userId = user.id

    console.log(`userId : ${JSON.stringify(user, null, 2)}`)

    return user
  }
}
