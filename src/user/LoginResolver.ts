// tslint:disable-next-line:no-var-requires
import { logger } from '../utils/logger';

// tslint:disable-next-line:no-var-requires
require('dotenv').config();

import { NETWORK_IDS } from '../provider';
import * as bcrypt from 'bcryptjs';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { keccak256 } from 'ethers/lib/utils';
import { User } from '../entities/user';
import { MyContext } from '../types/MyContext';
import * as jwt from 'jsonwebtoken';
import { registerEnumType, Field, ID, ObjectType } from 'type-graphql';
import config from '../config';
import SentryLogger from '../sentryLogger';
import { getAnalytics } from '../analytics/analytics';
import { findUserByWalletAddress } from '../repositories/userRepository';

const analytics = getAnalytics();
// tslint:disable-next-line:no-var-requires
const sigUtil = require('eth-sig-util');

@ObjectType()
class LoginResponse {
  @Field({ nullable: false })
  user: User;

  @Field({ nullable: false })
  token: string;
}

enum LoginType {
  Password = 'password',
  SignedMessage = 'message',
}

registerEnumType(LoginType, {
  name: 'Direction', // this one is mandatory
  description: 'Is the login request with a password or a signed message', // this one is optional
});

@Resolver()
export class LoginResolver {
  hostnameWhitelist = new Set(
    (config.get('HOSTNAME_WHITELIST') as string).split(','),
  );

  hostnameSignedMessageHashCache: { [id: string]: string } = {};
  // Return hash of message which should be signed by user
  // Null return means no hash message is available for hostname
  // Sign message differs based on application hostname (domain) in order to prevent sign-message popup in UI
  getHostnameSignMessageHash(hostname: string): string | null {
    const cache = this.hostnameSignedMessageHashCache;
    if (cache[hostname]) return cache[hostname];

    if (
      !this.hostnameWhitelist.has(hostname) &&
      !this.allowHostnameForDevelopment(hostname)
    )
      return null;

    const message = config.get('OUR_SECRET') as string;
    const customPrefix = `\u0019${hostname} Signed Message:\n`;
    const prefixWithLength = Buffer.from(
      `${customPrefix}${message.length.toString()}`,
      'utf-8',
    );
    const hashedMsg = keccak256(
      Buffer.concat([prefixWithLength, Buffer.from(message)]),
    );
    cache[hostname] = hashedMsg;
    return hashedMsg;
  }

  allowHostnameForDevelopment(hostname): boolean {
    if ((config.get('ENVIRONMENT') as string) === 'production') return false;

    const regex = config.get('DEVELOPMENT_HOSTNAME_REGEX') as string;
    if (!regex) return false;

    if (hostname.match(regex)) return true;

    return false;
  }

  // James: We don't need this right now, maybe in the future
  @Mutation(() => Boolean, { nullable: true })
  async validateToken(
    @Arg('token') token: string,
    @Ctx() ctx: MyContext,
  ): Promise<Boolean | null> {
    const secret = config.get('JWT_SECRET') as string;

    try {
      const decodedJwt: any = jwt.verify(token, secret);
      return true;
    } catch (error) {
      SentryLogger.captureMessage(error);

      logger.error(`Apollo Server error : ${JSON.stringify(error, null, 2)}`);
      logger.error(`Error for token ${token}`);
      return false;
    }
  }

  @Mutation(() => LoginResponse, { nullable: true })
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Arg('loginType', { nullable: true }) loginType: LoginType,
    @Ctx() ctx: MyContext,
  ): Promise<LoginResponse | null> {
    if (typeof loginType === 'undefined') {
      loginType = LoginType.Password;
    }
    switch (loginType) {
      case LoginType.SignedMessage:
        logger.debug('MESSAGE');
        loginType = LoginType.SignedMessage;
        break;
      case LoginType.Password:
        loginType = LoginType.Password;
        break;
      default:
        throw Error('Invalid login type');
    }

    const user: any = await User.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.loginType = :loginType', { loginType: 'password' })
      .addSelect('user.password')
      .getOne();

    if (!user) {
      logger.debug(`No user with email address ${email}`);
      return null;
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      // logger.debug('Invalid password')

      return null;
    }

    // if (!user.confirmed) {
    //   logger.debug('not confirmed')

    //   return null
    // }

    // Not using sessions anymore - ctx.req.session!.userId = user.id
    const accessToken = jwt.sign(
      { userId: user.id, firstName: user.firstName },
      config.get('JWT_SECRET') as string,
      { expiresIn: '30d' },
    );

    const response = new LoginResponse();

    delete user.password;
    response.user = user;
    response.token = accessToken;
    return response;
  }

  createToken(user: any) {
    return jwt.sign(user, config.get('JWT_SECRET') as string, {
      expiresIn: '30d',
    });
  }

  @Mutation(() => LoginResponse, { nullable: true })
  async loginWallet(
    @Arg('walletAddress') walletAddress: string,
    @Arg('signature') signature: string,
    @Arg('hostname') hostname: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('name', { nullable: true }) name: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    @Arg('networkId') networkId: number,
    @Ctx() ctx: MyContext,
  ): Promise<LoginResponse | null> {
    const hashedMsg = this.getHostnameSignMessageHash(hostname);

    const msgParams = JSON.stringify({
      primaryType: 'Login',
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'version', type: 'string' },
          // { name: 'verifyingContract', type: 'address' }
        ],
        Login: [{ name: 'user', type: 'User' }],
        User: [{ name: 'wallets', type: 'address[]' }],
      },
      domain: {
        name: 'Giveth Login',
        chainId: networkId,
        version: '1',
      },
      message: {
        contents: hashedMsg,
        user: {
          wallets: [walletAddress],
        },
      },
    });

    if (hashedMsg === null) return null;

    const publicAddress = sigUtil.recoverTypedSignature_v4({
      data: JSON.parse(msgParams),
      sig: signature,
    });

    if (!publicAddress) return null;

    const publicAddressLowerCase = publicAddress.toLocaleLowerCase();

    if (walletAddress.toLocaleLowerCase() !== publicAddressLowerCase)
      return null;

    let user = await findUserByWalletAddress(publicAddressLowerCase);

    try {
      if (!user) {
        user = await User.create({
          email,
          name,
          walletAddress: publicAddressLowerCase,
          loginType: 'wallet',
          avatar,
          segmentIdentified: true,
        }).save();
        logger.debug(`analytics.identifyUser -> New user`);

        analytics.identifyUser(user);
      } else {
        let modified = false;
        const updateUserIfNeeded = (field, value) => {
          // @ts-ignore
          if (user[field] !== value) {
            // @ts-ignore
            user[field] = value;
            modified = true;
          }
        };

        if (name) updateUserIfNeeded('name', name);

        updateUserIfNeeded('avatar', avatar);
        updateUserIfNeeded('walletAddress', publicAddressLowerCase);
        if (user.segmentIdentified === false) {
          logger.debug(`analytics.identifyUser -> User was already logged in`);
          analytics.identifyUser(user);
          user.segmentIdentified = true;
          modified = true;
        }
        if (modified) await user.save();
      }
      const response = new LoginResponse();

      response.token = this.createToken({
        userId: user.id,
        firstName: user.name,
        email: user.email,
        walletAddress: publicAddressLowerCase,
      });

      response.user = user;

      return response;
    } catch (e) {
      logger.error(e);
      return null;
    }
  }
}
