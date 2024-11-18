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
import { getLoggedInUser } from '../services/authorizationServices';
import { generateRandomNumericCode } from '../utils/utils';

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

  /**
   * Mutation to handle the process of sending a user email confirmation code.
   *
   * This function performs the following steps:
   * 1. **Retrieve Logged-In User**: Fetches the currently logged-in user using the context (`ctx`).
   * 2. **Check Email Verification Status**:
   *    - If the user's email is already verified, it throws an error with an appropriate message.
   * 3. **Check for Email Usage**:
   *    - Verifies if the provided email is already in use by another user in the database.
   *    - If the email exists and belongs to a different user, it returns `'EMAIL_EXIST'`.
   * 4. **Generate Verification Code**:
   *    - Creates a random 5-digit numeric code for email verification.
   *    - Updates the logged-in user's email verification code and email in the database.
   * 5. **Send Verification Code**:
   *    - Uses the notification adapter to send the generated verification code to the provided email.
   * 6. **Save User Record**:
   *    - Saves the updated user information (email and verification code) to the database.
   * 7. **Return Status**:
   *    - If the verification code is successfully sent, it returns `'VERIFICATION_SENT'`.
   *
   * @param {string} email - The email address to verify.
   * @param {ApolloContext} ctx - The GraphQL context containing user and other relevant information.
   * @returns {Promise<string>} - A status string indicating the result of the operation:
   *    - `'EMAIL_EXIST'`: The email is already used by another user.
   *    - `'VERIFICATION_SENT'`: The verification code has been sent successfully.
   * @throws {Error} - If the user's email is already verified.
   */
  @Mutation(_returns => String)
  async sendUserEmailConfirmationCodeFlow(
    @Arg('email') email: string,
    @Ctx() ctx: ApolloContext,
  ): Promise<string> {
    const user = await getLoggedInUser(ctx);

    // Check if email aready verified
    if (user.isEmailVerified) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.USER_EMAIL_ALREADY_VERIFIED),
      );
    }

    // Check do we have an email already in the database
    const isEmailAlreadyUsed = await User.findOne({
      where: { email: email },
    });

    if (isEmailAlreadyUsed && isEmailAlreadyUsed.id !== user.id) {
      return 'EMAIL_EXIST';
    }

    // Send verification code
    const code = generateRandomNumericCode(5).toString();

    user.emailVerificationCode = code;
    user.email = email;

    await getNotificationAdapter().sendUserEmailConfirmationCodeFlow({
      email: email,
      user: user,
    });

    await user.save();

    return 'VERIFICATION_SENT';
  }

  /**
   * Mutation to handle the user confirmation code verification process.
   *
   * This function performs the following steps:
   * 1. **Retrieve Logged-In User**: Fetches the currently logged-in user using the provided context (`ctx`).
   * 2. **Check Email Verification Status**:
   *    - If the user's email is already verified, an error is thrown with an appropriate message.
   * 3. **Verify Email Verification Code Presence**:
   *    - Checks if the user has a stored email verification code in the database.
   *    - If no code exists, an error is thrown indicating that the code was not found.
   * 4. **Validate the Verification Code**:
   *    - Compares the provided `verifyCode` with the user's stored email verification code.
   *    - If the codes do not match, an error is thrown indicating the mismatch.
   * 5. **Mark Email as Verified**:
   *    - If the verification code matches, the user's `emailVerificationCode` is cleared (set to `null`),
   *      and the `isEmailVerified` flag is set to `true`.
   * 6. **Save Updated User Data**:
   *    - The updated user record (email verified status) is saved to the database.
   * 7. **Return Status**:
   *    - Returns `'VERIFICATION_SUCCESS'` to indicate the email verification was completed successfully.
   *
   * @param {string} verifyCode - The verification code submitted by the user for validation.
   * @param {ApolloContext} ctx - The GraphQL context containing the logged-in user's information.
   * @returns {Promise<string>} - A status string indicating the result of the verification process:
   *    - `'VERIFICATION_SUCCESS'`: The email has been successfully verified.
   * @throws {Error} - If:
   *    - The user's email is already verified.
   *    - No verification code is found in the database for the user.
   *    - The provided verification code does not match the stored code.
   */
  @Mutation(_returns => String)
  async sendUserConfirmationCodeFlow(
    @Arg('verifyCode') verifyCode: string,
    @Ctx() ctx: ApolloContext,
  ): Promise<string> {
    const user = await getLoggedInUser(ctx);

    // Check if email aready verified
    if (user.isEmailVerified) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.USER_EMAIL_ALREADY_VERIFIED),
      );
    }

    // Check do we have an email verification code inside database
    if (!user.emailVerificationCode) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.USER_EMAIL_CODE_NOT_FOUND),
      );
    }

    // Check if code matches
    if (verifyCode !== user.emailVerificationCode) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.USER_EMAIL_CODE_NOT_MATCH),
      );
    }

    // Save Updated User Data
    user.emailVerificationCode = null;
    user.isEmailVerified = true;

    await user.save();

    return 'VERIFICATION_SUCCESS';
  }
}
