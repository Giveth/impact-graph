import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { RegisterInput } from '../user/register/RegisterInput';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { ApolloContext } from '../types/ApolloContext';
import { NOTIFICATIONS_EVENT_NAMES } from '../analytics/analytics';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { validateEmail } from '../utils/validators/commonValidators';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import { createNewAccountVerification } from '../repositories/accountVerificationRepository';
import { UserByAddressResponse } from './types/userResolver';
import { SegmentAnalyticsSingleton } from '../services/segment/segmentAnalyticsSingleton';
import { AppDataSource } from '../orm';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { isWalletAddressInPurpleList } from '../repositories/projectAddressRepository';
import { addressHasDonated } from '../repositories/donationRepository';

@Resolver(of => User)
export class UserResolver {
  constructor(private readonly userRepository: Repository<User>) {
    this.userRepository = AppDataSource.getDataSource().getRepository(User);
  }

  async create(@Arg('data', () => RegisterInput) data: any) {
    // return User.create(data).save();
  }

  @Query(returns => Boolean)
  async walletAddressUsed(@Arg('address') address: string): Promise<Boolean> {
    return (
      (await isWalletAddressInPurpleList(address)) ||
      (await addressHasDonated(address))
    );
  }

  @Query(returns => UserByAddressResponse, { nullable: true })
  async userByAddress(
    @Arg('address', type => String) address: string,
    @Ctx() { req: { user } }: ApolloContext,
  ) {
    const includeSensitiveFields =
      user?.walletAddress?.toLowerCase() === address.toLowerCase();
    const foundUser = await findUserByWalletAddress(
      address,
      includeSensitiveFields,
    );
    return {
      isSignedIn: Boolean(user),
      ...foundUser,
    };
  }

  @Query(returns => User, { nullable: true })
  async refreshUserScores(
    @Arg('address', type => String) address: string,
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
      const passportScore = await getGitcoinAdapter().submitPassport({
        address,
      });
      const passportStamps = await getGitcoinAdapter().getPassportStamps(
        address,
      );

      if (passportScore && passportScore?.score) {
        const score = Number(passportScore.score);
        foundUser.passportScore = score;
      }
      if (passportStamps)
        foundUser.passportStamps = passportStamps.items.length;
      await foundUser.save();
    } catch (e) {
      logger.error(`refreshUserScores Error with address ${address}: `, e);
    }

    return foundUser;
  }

  @Mutation(returns => Boolean)
  async updateUser(
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('url', { nullable: true }) url: string,
    @Arg('avatar', { nullable: true }) avatar: string,
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

    const segmentUpdateProfile = {
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      location: dbUser.location,
      email: dbUser.email,
      url: dbUser.url,
    };

    SegmentAnalyticsSingleton.getInstance().identifyUser(dbUser);
    SegmentAnalyticsSingleton.getInstance().track(
      NOTIFICATIONS_EVENT_NAMES.UPDATED_PROFILE,
      dbUser.segmentUserId(),
      segmentUpdateProfile,
      null,
    );

    return true;
  }

  // Sets the current account verification and creates related verifications
  @Mutation(returns => Boolean)
  async addUserVerification(
    @Arg('dId', { nullable: true }) dId: string,
    @Arg('verifications', type => [AccountVerificationInput])
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
}
