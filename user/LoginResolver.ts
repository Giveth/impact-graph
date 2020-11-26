// tslint:disable-next-line:no-var-requires
require('dotenv').config()
import * as bcrypt from 'bcryptjs'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { User } from '../entities/user'
import { MyContext } from '../types/MyContext'
import * as jwt from 'jsonwebtoken'
import { registerEnumType, Field, ID, ObjectType } from 'type-graphql'
import { web3 } from "../utils/web3";
import config from '../config'


@ObjectType()
class LoginResponse {
  @Field({ nullable: false })
  user: User

  @Field({ nullable: false })
  token: string
}

enum LoginType {
  Password = 'password',
  SignedMessage = 'message'
}
registerEnumType(LoginType, {
  name: 'Direction', // this one is mandatory
  description: 'Is the login request with a password or a signed message' // this one is optional
})
@Resolver()
export class LoginResolver {
  @Mutation(() => LoginResponse, { nullable: true })
  async login (
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Arg('loginType', { nullable: true }) loginType: LoginType,
    @Ctx() ctx: MyContext
  ): Promise<LoginResponse | null> {
    if (typeof loginType === 'undefined') {
      loginType = LoginType.Password
    } else {
      console.log(`typeof  loginType ---> : ${typeof loginType}`)
      console.log('message login')
    }
    switch (loginType) {
      case LoginType.SignedMessage:
        console.log('MESSAGE')
        loginType = LoginType.SignedMessage
        break
      case LoginType.Password:
        console.log('PASS')
        loginType = LoginType.Password
        break
      default:
        throw Error('Invalid login type')
    }

    console.log('Finding user with email ' + email)

    const user: any = await User.findOne({
      where: { email, loginType: 'password' }
    })

    if (!user) {
      console.log(`No user with email address ${email}`)

      return null
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      console.log('Not valid')

      // return null
    }

    // if (!user.confirmed) {
    //   console.log('not confirmed')

    //   return null
    // }

    // Not using sessions anymore - ctx.req.session!.userId = user.id
    const accessToken = jwt.sign(
      { userId: user.id, firstName: user.firstName },
      config.get('JWT_SECRET') as string,
      { expiresIn: '30d' }
    )

    console.log(`accessToken ---> : ${accessToken}`)
    console.log(`userId : ${JSON.stringify(user, null, 2)}`)
    const response = new LoginResponse()

    response.user = user
    response.token = accessToken
    return response
  }

  createToken (user: any) {
    console.log(`user : ${JSON.stringify(user, null, 2)}`)

    return jwt.sign(user, config.get('JWT_SECRET') as string, {
      expiresIn: '30d'
    })
  }

  @Mutation(() => LoginResponse, { nullable: true })
  async loginWallet (
    @Arg('walletAddress') walletAddress: string,
    @Arg('signature') signature: string,
    @Arg('email') email: string,
    @Arg('name', { nullable: true }) name: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    @Ctx() ctx: MyContext
  ): Promise<LoginResponse | null> {
    console.log('Login waller')
    console.log(`walletAddress ---> : ${walletAddress}`)
    console.log(`signature ---> : ${signature}`)
    const publicAddress = await web3.eth.accounts.recover(
      'our_secret',
      signature
    )
    console.log(`publicAddress : ${JSON.stringify(publicAddress, null, 2)}`)
    let user = await User.findOne({ where: { email } })

    if (!user) {
      console.log(`No user with email address ${email}`)

      user = await User.create({
        email,
        name,
        walletAddress,
        loginType: 'wallet',
        avatar
      }).save()

      console.log(`user saved : ${JSON.stringify(user, null, 2)}`)
    } else {
      console.log('user exists already')

      user.avatar = avatar;
      await user.save();
    }
    const response = new LoginResponse()

    response.token = this.createToken({
      userId: user.id,
      firstName: user.name,
      email: user.email
    })
    response.user = user

    console.log(`response : ${JSON.stringify(response, null, 2)}`)

    return response
  }
}
