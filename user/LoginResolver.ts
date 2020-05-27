require('dotenv').config()
import bcrypt from 'bcryptjs'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { User } from '../entities/user'
import { MyContext } from '../types/MyContext'
import jwt from 'jsonwebtoken'
import { Field, ID, ObjectType } from 'type-graphql'

@ObjectType()
class LoginResponse {
  @Field({ nullable: false })
  user: User

  @Field({ nullable: false })
  token: string
}

@Resolver()
export class LoginResolver {
  @Mutation(() => LoginResponse, { nullable: true })
  async login (
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() ctx: MyContext
  ): Promise<LoginResponse | null> {
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

    // if (!user.confirmed) {
    //   console.log('not confirmed')

    //   return null
    // }

    console.log(`successfully logged in`)
    // Not using sessions anymore - ctx.req.session!.userId = user.id
    const accessToken = jwt.sign(
      { userId: user.id, firstName: user.firstName },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    console.log(`accessToken ---> : ${accessToken}`)
    console.log(`userId : ${JSON.stringify(user, null, 2)}`)
    const response = new LoginResponse()

    response.user = user
    response.token = accessToken
    return response
  }
}
