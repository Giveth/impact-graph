import {
  Resolver,
  Query,
  FieldResolver,
  Arg,
  Root,
  Mutation,
  Ctx,
  Int,
} from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Repository, In } from 'typeorm';

import { User } from '../entities/user';
import { RegisterInput } from '../user/register/RegisterInput';
import { AccountVerification } from '../entities/accountVerification';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { MyContext } from '../types/MyContext';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import { errorMessages } from '../utils/errorMessages';
import { Project } from '../entities/project';
import { validateEmail } from '../utils/validators/commonValidators';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import { createNewAccountVerification } from '../repositories/accountVerificationRepository';

const analytics = getAnalytics();

@Resolver(of => User)
export class UserResolver {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AccountVerification)
    @InjectRepository(Project)
    private readonly accountVerificationRepository: Repository<AccountVerification>,
  ) {}

  async create(@Arg('data', () => RegisterInput) data: any) {
    // return User.create(data).save();
  }

  // TODO it seems this endpoint doesnt use https://github.com/Giveth/giveth-dapps-v2/blob/develop/src/apollo/gql/gqlUser.ts
  @Query(returns => User, { nullable: true })
  async user(@Arg('userId', type => Int) userId: number) {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['accountVerifications', 'projects'],
    });
  }

  @Query(returns => User, { nullable: true })
  userByAddress(@Arg('address', type => String) address: string) {
    return findUserByWalletAddress(address);
  }

  @Mutation(returns => Boolean)
  async updateUser(
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('url', { nullable: true }) url: string,
    @Arg('avatar', { nullable: true }) avatar: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    const dbUser = await findUserById(user.userId);
    if (!dbUser) {
      return false;
    }
    if (!dbUser.name && !firstName && !lastName) {
      throw new Error(
        errorMessages.BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY,
      );
    }
    if (firstName === '') {
      throw new Error(errorMessages.FIRSTNAME_CANT_BE_EMPTY_STRING);
    }
    if (lastName === '') {
      throw new Error(errorMessages.LASTNAME_CANT_BE_EMPTY_STRING);
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
        throw new Error(errorMessages.INVALID_EMAIL);
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

    analytics.identifyUser(dbUser);
    analytics.track(
      SegmentEvents.UPDATED_PROFILE,
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
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const currentUser = await findUserById(user.userId);
    if (!currentUser) throw new Error(errorMessages.USER_NOT_FOUND);

    currentUser.dId = dId;
    await currentUser.save();

    const associatedVerifications = verificationsInput.map(verification => {
      return { ...verification, user: currentUser, dId };
    });

    // I don't know wether we use this mutation or not, maybe it's useless
    await createNewAccountVerification(associatedVerifications);

    return true;
  }

  // @FieldResolver()
  // organisationUsers (@Root() user: User) {
  //   return this.organisationUserRepository.find({
  //     cache: 1000,
  //     where: { authorId: user.id }
  //   })
  // }

  // @FieldResolver()
  // async organisations (@Root() user: User) {
  //   const orgs = await this.userRepository.find({
  //     relations: ['organisations']
  //   })
  //   logger.debug(`orgs : ${JSON.stringify(orgs, null, 2)}`)

  //   process.exit()
  // }

  // @FieldResolver()
  // async organisations (@Root() user: User) {
  //   const organisationUsers = await this.organisationUserRepository.find({
  //     cache: 1000,
  //     where: { userId: user.id }
  //   })

  //   const organisationUserIds = organisationUsers.map(o => o.id)
  //   return await this.organisationRepository.find({
  //     cache: 1000,
  //     where: { organisationUserId: In(organisationUserIds) }
  //   })
  // }
}
