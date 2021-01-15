// tslint:disable-next-line:no-var-requires
require('dotenv').config()
import * as bcrypt from 'bcryptjs'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { keccak256 } from 'ethers/lib/utils';
import { ethers } from 'ethers';
import { User } from '../entities/user'
import { MyContext } from '../types/MyContext'
import * as jwt from 'jsonwebtoken'
import { registerEnumType, Field, ID, ObjectType } from 'type-graphql'
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
  hostnameWhitelist = new Set((config.get('HOSTNAME_WHITELIST') as string).split(','))

  hostnameSignedMessageHashCache: {[id: string]:string} = {}
  // Return hash of message which should be signed by user
  // Null return means no hash message is available for hostname
  // Sign message differs based on application hostname (domain) in order to prevent sign-message popup in UI
  getHostnameSignMessageHash(hostname: string): string | null {
    const cache = this.hostnameSignedMessageHashCache;
    if (cache[hostname]) return cache[hostname];

    if (!this.hostnameWhitelist.has(hostname))
      return null;

    const message = 'our_secret';
    const customPrefix = `\u0019${hostname} Signed Message:\n`
    const prefixWithLength = Buffer.from(`${customPrefix}${message.length.toString()}`, 'utf-8')
    const hashedMsg = keccak256(Buffer.concat([prefixWithLength, Buffer.from(message)]))
    cache[hostname] = hashedMsg
    return hashedMsg
  }

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
    @Arg('hostname') hostname: string,
    @Arg('email') email: string,
    @Arg('name', { nullable: true }) name: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    @Ctx() ctx: MyContext
  ): Promise<LoginResponse | null> {
    const hashedMsg = this.getHostnameSignMessageHash(hostname)

    if (hashedMsg === null) return null;

    const publicAddress = ethers.utils.recoverAddress(hashedMsg, signature);

    if (!publicAddress) return null;

    const publicAddressLowerCase = publicAddress.toLocaleLowerCase();

    if (walletAddress.toLocaleLowerCase() !== publicAddressLowerCase) return null;

    let user = await User.findOne({ where: { email } })

    try {

      if (!user) {
        user = await User.create({
          email,
          name,
          walletAddress: publicAddressLowerCase,
          loginType: 'wallet',
          avatar
        }).save()

      } else {

        let modified = false;
        const updateUserIfNeeded = (field, value) => {
          // @ts-ignore
          if (user[field] !== value) {
            // @ts-ignore
            user[field] = value;
            modified = true;
          }
        }

        if (name)
          updateUserIfNeeded('name', name);

        updateUserIfNeeded('avatar', avatar);
        updateUserIfNeeded('walletAddress', publicAddressLowerCase);

        if (modified)
          await user.save();
      }
      const response = new LoginResponse()

      response.token = this.createToken({
        userId: user.id,
        firstName: user.name,
        email: user.email,
        walletAddress: publicAddressLowerCase
      })

      response.user = user

      return response
    } catch (e) {
      console.error(e)
      return null;
    }
  }
}
