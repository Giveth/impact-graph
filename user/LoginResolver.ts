// tslint:disable-next-line:no-var-requires
require('dotenv').config()
import * as bcrypt from 'bcryptjs'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { User } from '../entities/user'
import { MyContext } from '../types/MyContext'
import * as jwt from 'jsonwebtoken'
import { registerEnumType, Field, ID, ObjectType } from 'type-graphql'
import { web3 } from '../utils/web3';
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
    } 
    switch (loginType) {
      case LoginType.SignedMessage:
        console.log('MESSAGE')
        loginType = LoginType.SignedMessage
        break
      case LoginType.Password:
        loginType = LoginType.Password
        break
      default:
        throw Error('Invalid login type')
    }

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

    const response = new LoginResponse()

    response.user = user
    response.token = accessToken
    return response
  }

  createToken (user: any) {
   
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
    const publicAddress = await web3.eth.accounts.recover(
      'our_secret',
      signature
    )
    let user = await User.findOne({ where: { email } })

    if (!user) {
     
      user = await User.create({
        email,
        name,
        walletAddress,
        loginType: 'wallet',
        avatar
      }).save()

    } else {
   
      user.avatar = avatar;
      if(name) user.name = name;
      await user.save();
    }
    const response = new LoginResponse()

    response.token = this.createToken({
      userId: user.id,
      firstName: user.name,
      email: user.email
    })
    response.user = user

    
    return response
  }
}
