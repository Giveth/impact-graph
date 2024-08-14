import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { validateEmail } from '../utils/validators/commonValidators';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import { createNewAccountVerification } from '../repositories/accountVerificationRepository';
import { UserByAddressResponse } from './types/userResolver';
import { AppDataSource } from '../orm';
import {
  getGitcoinAdapter,
  getNotificationAdapter,
} from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { isWalletAddressInPurpleList } from '../repositories/projectAddressRepository';
import { addressHasDonated } from '../repositories/donationRepository';
import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { retrieveActiveQfRoundUserMBDScore } from '../repositories/qfRoundRepository';
import { generateEmailVerificationCode } from '../utils/utils';
import { getLoggedInUser } from '../services/authorizationServices';

@ObjectType()
class UserRelatedAddressResponse {
  @Field(_type => Boolean, { nullable: false })
  hasRelatedProject: boolean;

  @Field(_type => Boolean, { nullable: false })
  hasDonated: boolean;
}

@Resolver(_of => User)
export class UserResolver {
  constructor(private readonly userRepository: Repository<User>) {
    this.userRepository = AppDataSource.getDataSource().getRepository(User);
  }

  // async create(@Arg('data', () => RegisterInput) data: any) {
  // return User.create(data).save();
  // }

  @Query(_returns => UserRelatedAddressResponse)
  async walletAddressUsed(@Arg('address') address: string) {
    return {
      hasRelatedProject: await isWalletAddressInPurpleList(address),
      hasDonated: await addressHasDonated(address),
    };
  }

  @Query(_returns => UserByAddressResponse, { nullable: true })
  async userByAddress(
    @Arg('address', _type => String) address: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const includeSensitiveFields =
      user?.walletAddress?.toLowerCase() === address.toLowerCase();
    const foundUser = await findUserByWalletAddress(
      address,
      includeSensitiveFields,
    );
    if (!foundUser) {
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
    }
    return {
      isSignedIn: Boolean(user),
      ...foundUser,
    };
  }

  @Query(_returns => User, { nullable: true })
  async refreshUserScores(
    @Arg('address', _type => String) address: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const includeSensitiveFields =
      user?.walletAddress?.toLowerCase() === address.toLowerCase();
    const foundUser = await findUserByWalletAddress(
      address,
      includeSensitiveFields,
    );

    if (!foundUser) return;

    try {
      // Refresh user score
      await getGitcoinAdapter().submitPassport({
        address,
      });

      const passportScore =
        await getGitcoinAdapter().getWalletAddressScore(address);

      const passportStamps =
        await getGitcoinAdapter().getPassportStamps(address);

      if (passportScore && passportScore?.score) {
        const score = Number(passportScore.score);
        foundUser.passportScore = score;
      }
      if (passportStamps)
        foundUser.passportStamps = passportStamps.items.length;

      const activeQFMBDScore = await retrieveActiveQfRoundUserMBDScore(
        foundUser.id,
      );
      if (activeQFMBDScore) {
        foundUser.activeQFMBDScore = activeQFMBDScore;
      }
      await foundUser.save();
    } catch (e) {
      logger.error(`refreshUserScores Error with address ${address}: `, e);
    }

    return foundUser;
  }

  @Mutation(_returns => Boolean)
  async updateUser(
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('url', { nullable: true }) url: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    @Arg('newUser', { nullable: true }) newUser: boolean,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    const dbUser = await findUserById(user.userId);
    if (!dbUser) {
      return false;
    }
    if (!dbUser.name && !firstName && !lastName) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY,
        ),
      );
    }
    if (firstName === '') {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.FIRSTNAME_CANT_BE_EMPTY_STRING),
      );
    }
    if (lastName === '') {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.LASTNAME_CANT_BE_EMPTY_STRING),
      );
    }
    if (firstName) {
      dbUser.firstName = firstName;
    }
    if (lastName) {
      dbUser.lastName = lastName;
    }
    if (location !== undefined) {
      dbUser.location = location;
    }
    if (email !== undefined) {
      // User can unset his email by putting empty string
      if (!validateEmail(email)) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_EMAIL));
      }
      dbUser.email = email;
    }
    if (url !== undefined) {
      dbUser.url = url;
    }
    if (avatar !== undefined) {
      dbUser.avatar = avatar;
    }

    dbUser.name = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim();
    await dbUser.save();

    const orttoPerson = getOrttoPersonAttributes({
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      email: dbUser.email,
      userId: dbUser.id.toString(),
    });
    await getNotificationAdapter().updateOrttoPeople([orttoPerson]);
    if (newUser) {
      await getNotificationAdapter().createOrttoProfile(dbUser);
    }

    return true;
  }

  // Sets the current account verification and creates related verifications
  @Mutation(_returns => Boolean)
  async addUserVerification(
    @Arg('dId', { nullable: true }) dId: string,
    @Arg('verifications', _type => [AccountVerificationInput])
    verificationsInput: AccountVerificationInput[],
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const currentUser = await findUserById(user.userId);
    if (!currentUser)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    currentUser.dId = dId;
    await currentUser.save();

    const associatedVerifications = verificationsInput.map(verification => {
      return { ...verification, user: currentUser, dId };
    });

    // I don't know wether we use this mutation or not, maybe it's useless
    await createNewAccountVerification(associatedVerifications);

    return true;
  }

  @Mutation(_returns => Boolean)
  async sendUserEmailConfirmationCodeFlow(
    @Arg('email') email: string,
    @Ctx() ctx: ApolloContext,
  ): Promise<boolean> {
    const user = await getLoggedInUser(ctx);

    if (user.isEmailVerified)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.EMAIL_ALREADY_VERIFIED),
      );

    const code = generateEmailVerificationCode();

    await getNotificationAdapter().sendEmailConfirmationCodeFlow({
      email: email,
      user: user,
    });

    user.verificationCode = code;

    await user.save();

    return true;
  }

  @Mutation(_returns => Boolean)
  async verifyUserEmailCode(
    @Arg('code') code: number,
    @Ctx() ctx: ApolloContext,
  ): Promise<boolean> {
    const user = await getLoggedInUser(ctx);

    if (!user)
      throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));

    if (user.isEmailVerified)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.EMAIL_ALREADY_VERIFIED),
      );

    if (user.verificationCode !== code)
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_EMAIL_CODE));

    user.isEmailVerified = true;
    user.verificationCode = undefined;

    await user.save();

    return true;
  }
}
