import {
  Arg,
  Ctx,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Repository } from 'typeorm';

import moment from 'moment';
import { User } from '../entities/user';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { validateEmail } from '../utils/validators/commonValidators';
import {
  findUserById,
  findUserByWalletAddress,
  updateUserEmailConfirmationStatus,
  getUserEmailConfirmationFields,
} from '../repositories/userRepository';
import { createNewAccountVerification } from '../repositories/accountVerificationRepository';
import { UserByAddressResponse } from './types/userResolver';
import { AppDataSource } from '../orm';
import {
  getGitcoinAdapter,
  getNotificationAdapter,
  privadoAdapter,
} from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';
import { isWalletAddressInPurpleList } from '../repositories/projectAddressRepository';
import { addressHasDonated } from '../repositories/donationRepository';
// import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { retrieveActiveQfRoundUserMBDScore } from '../repositories/qfRoundRepository';
import { PrivadoAdapter } from '../adapters/privado/privadoAdapter';
import { getProjectUserRecordAmount } from '../repositories/projectUserRecordRepository';

@ObjectType()
class UserRelatedAddressResponse {
  @Field(_type => Boolean, { nullable: false })
  hasRelatedProject: boolean;

  @Field(_type => Boolean, { nullable: false })
  hasDonated: boolean;
}

@ObjectType()
class BatchMintingEligibleUserResponse {
  @Field(_addresses => [String], { nullable: false })
  users: string[];

  @Field(_total => Number, { nullable: false })
  total: number;

  @Field(_offset => Number, { nullable: false })
  skip: number;
}

// eslint-disable-next-line unused-imports/no-unused-imports
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

  @Query(_returns => BatchMintingEligibleUserResponse)
  async batchMintingEligibleUsers(
    @Arg('limit', _type => Int, { nullable: true }) limit: number = 1000,
    @Arg('skip', _type => Int, { nullable: true }) skip: number = 0,
    @Arg('filterAddress', { nullable: true }) filterAddress: string,
  ) {
    if (filterAddress) {
      const query = User.createQueryBuilder('user').where(
        `LOWER("walletAddress") = :walletAddress`,
        {
          walletAddress: filterAddress.toLowerCase(),
        },
      );

      const userExists = await query.getExists();

      return {
        users: userExists ? [filterAddress] : [],
        total: userExists ? 1 : 0,
        skip: 0,
      };
    }

    const response = await User.createQueryBuilder('user')
      .select('user.walletAddress')
      .where('user.acceptedToS = true')
      .andWhere(':privadoRequestId = ANY (user.privadoVerifiedRequestIds)', {
        privadoRequestId: PrivadoAdapter.privadoRequestId,
      })
      .orderBy('user.acceptedToSDate', 'ASC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return {
      users: response[0].map((user: User) => user.walletAddress),
      total: response[1],
      skip,
    };
  }

  @Mutation(_returns => Boolean)
  async updateUser(
    @Arg('fullName', { nullable: true }) fullName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('url', { nullable: true }) url: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    // @Arg('newUser', { nullable: true }) newUser: boolean,
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

    if (!fullName || fullName === '') {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.FULL_NAME_CAN_NOT_BE_EMPTY),
      );
    }
    dbUser.name = fullName.trim();
    const [first, ...rest] = fullName.split(' ');
    dbUser.firstName = first;
    dbUser.lastName = rest.join(' ') || '';

    // Update other fields
    if (location !== undefined) {
      dbUser.location = location;
    }
    if (email !== undefined) {
      // User can unset his email by putting empty string
      if (!validateEmail(email)) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_EMAIL));
      }
      if (dbUser.email !== email) {
        await updateUserEmailConfirmationStatus({
          userId: dbUser.id,
          emailConfirmed: false,
          emailConfirmedAt: null,
          emailVerificationCodeExpiredAt: null,
          emailVerificationCode: null,
          emailConfirmationSent: false,
          emailConfirmationSentAt: null,
        });
        dbUser.emailConfirmed = false;
        dbUser.emailConfirmedAt = null;
        dbUser.emailConfirmationSent = false;
        dbUser.emailConfirmationSentAt = null;
        dbUser.email = email;
      }
    }
    if (url !== undefined) {
      dbUser.url = url;
    }
    if (avatar !== undefined) {
      dbUser.avatar = avatar;
    }

    await dbUser.save();

    // const orttoPerson = getOrttoPersonAttributes({
    //   firstName: dbUser.firstName,
    //   lastName: dbUser.lastName,
    //   email: dbUser.email,
    //   userId: dbUser.id.toString(),
    // });
    // await getNotificationAdapter().updateOrttoPeople([orttoPerson]);
    // if (newUser) {
    //   await getNotificationAdapter().createOrttoProfile(dbUser);
    // }

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

  @Mutation(_returns => User)
  async userVerificationSendEmailConfirmation(
    @Arg('userId') userId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User> {
    try {
      const currentUserId = user?.userId;
      if (!currentUserId || currentUserId != userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const userToVerify = await findUserById(userId);

      if (!userToVerify) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      const email = userToVerify.email;
      if (!email) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.NO_EMAIL_PROVIDED),
        );
      }
      if (userToVerify.emailConfirmed) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.YOU_ALREADY_VERIFIED_THIS_EMAIL),
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const emailVerificationCodeExpiredAt = moment()
        .add(30, 'minutes')
        .toDate();

      await updateUserEmailConfirmationStatus({
        userId: userToVerify.id,
        emailConfirmed: false,
        emailConfirmedAt: null,
        emailVerificationCodeExpiredAt,
        emailVerificationCode: code,
        emailConfirmationSent: true,
        emailConfirmationSentAt: new Date(),
      });

      const updatedUser = await findUserById(userId);

      if (!updatedUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      await getNotificationAdapter().sendUserEmailConfirmation({
        email,
        code,
      });

      return updatedUser;
    } catch (e) {
      logger.error('userVerificationSendEmailConfirmation() error', e);
      throw e;
    }
  }

  @Mutation(_returns => User)
  async userVerificationConfirmEmail(
    @Arg('userId') userId: number,
    @Arg('emailConfirmationCode') emailConfirmationCode: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<User> {
    try {
      const currentUserId = user?.userId;
      if (!currentUserId || currentUserId !== userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const userFromDB = await findUserById(userId);

      if (!userFromDB) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      const emailConfirmationFields = await getUserEmailConfirmationFields(
        userFromDB.id,
      );

      if (!emailConfirmationFields) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.NO_EMAIL_VERIFICATION_DATA),
        );
      }

      if (
        emailConfirmationCode !== emailConfirmationFields.emailVerificationCode
      ) {
        throw new Error(i18n.__(translationErrorMessagesKeys.INCORRECT_CODE));
      }

      const currentTime = new Date();
      if (
        emailConfirmationFields.emailVerificationCodeExpiredAt &&
        emailConfirmationFields.emailVerificationCodeExpiredAt < currentTime
      ) {
        throw new Error(i18n.__(translationErrorMessagesKeys.CODE_EXPIRED));
      }

      await updateUserEmailConfirmationStatus({
        userId: userFromDB.id,
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        emailVerificationCodeExpiredAt: null,
        emailVerificationCode: null,
        emailConfirmationSent: false,
        emailConfirmationSentAt: null,
      });

      const updatedUser = await findUserById(userId);

      if (!updatedUser) {
        throw new Error(i18n.__(translationErrorMessagesKeys.USER_NOT_FOUND));
      }

      return updatedUser;
    } catch (e) {
      logger.error('userVerificationConfirmEmail() error', e);
      throw e;
    }
  }

  @Mutation(_returns => Boolean)
  async checkUserPrivadoVerifiedState(
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    return await privadoAdapter.checkUserVerified(user.userId);
  }

  @Mutation(_returns => Boolean)
  async acceptedTermsOfService(
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const userFromDB = await findUserById(user.userId);

    if (userFromDB?.privadoVerified && !userFromDB.acceptedToS) {
      userFromDB.acceptedToS = true;
      userFromDB.acceptedToSDate = new Date();
      await userFromDB.save();
      return true;
    }
    return false;
  }

  @Query(_returns => Number)
  async projectUserTotalDonationAmount(
    @Arg('projectId', _type => Int, { nullable: false }) projectId: number,
    @Arg('userId', _type => Int, { nullable: false }) userId: number,
  ) {
    return getProjectUserRecordAmount({ projectId, userId });
  }
}
