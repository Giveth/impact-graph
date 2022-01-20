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

import { OrganisationUser } from '../entities/organisationUser';
import { User } from '../entities/user';
import { RegisterInput } from '../user/register/RegisterInput';
import { AccountVerification } from '../entities/accountVerification';
import { AccountVerificationInput } from './types/accountVerificationInput';
import { Organisation } from '../entities/organisation';
import { MyContext } from '../types/MyContext';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import { errorMessages } from '../utils/errorMessages';
import { Project } from '../entities/project';

const analytics = getAnalytics();

@Resolver(of => User)
export class UserResolver {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>, // , // @InjectRepository(OrganisationUser) // private readonly organisationUserRepository: Repository<OrganisationUser>
    @InjectRepository(AccountVerification)
    @InjectRepository(Project)
    private readonly accountVerificationRepository: Repository<AccountVerification>,
  ) {}

  async create(@Arg('data', () => RegisterInput) data: any) {
    // return User.create(data).save();
  }

  @Query(returns => User, { nullable: true })
  async user(@Arg('userId', type => Int) userId: number) {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['accountVerifications', 'projects'],
    });
  }

  @Query(returns => User, { nullable: true })
  userByAddress(@Arg('address', type => String) address: string) {
    return this.userRepository.findOne({ walletAddress: address });
  }

  @Mutation(returns => Boolean)
  async updateUser(
    @Arg('firstName', { nullable: true }) firstName: string,
    @Arg('lastName', { nullable: true }) lastName: string,
    @Arg('location', { nullable: true }) location: string,
    @Arg('email', { nullable: true }) email: string,
    @Arg('name', { nullable: true }) name: string,
    @Arg('url', { nullable: true }) url: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user) throw new Error('Authentication required.');
    const dbUser = await User.findOne({ id: user.userId });
    if (!dbUser) {
      return false;
    }
    if (!firstName && !lastName) {
      throw new Error(
        errorMessages.BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY,
      );
    }
    let fullName: string = '';
    if (!name) {
      fullName = firstName + ' ' + lastName;
    } else {
      fullName = name;
    }
    const idUser = dbUser;
    idUser.firstName = firstName;
    idUser.lastName = lastName;
    idUser.name = fullName;
    idUser.location = location;
    idUser.email = email;
    idUser.url = url;
    await idUser.save();

    const segmentUpdateProfile = {
      firstName: idUser.firstName,
      lastName: idUser.lastName,
      location: idUser.location,
      email: idUser.email,
      url: idUser.url,
    };

    analytics.identifyUser(idUser);
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
    if (!user) throw new Error('Authentication required.');

    const currentUser = await User.findOne({ id: user.userId });
    if (!currentUser) throw new Error(errorMessages.USER_NOT_FOUND);

    currentUser.dId = dId;
    await currentUser.save();

    const associatedVerifications = verificationsInput.map(verification => {
      return { ...verification, user: currentUser, dId };
    });
    const accountVerifications = this.accountVerificationRepository.create(
      associatedVerifications,
    );
    await this.accountVerificationRepository.save(accountVerifications);

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
