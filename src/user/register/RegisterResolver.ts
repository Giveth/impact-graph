// tslint:disable-next-line:no-var-requires
import { logger } from '../../utils/logger';

// tslint:disable-next-line:no-var-requires
const bcrypt = require('bcryptjs');
import { Resolver, Query, Mutation, Arg, UseMiddleware } from 'type-graphql';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Organisation } from '../../entities/organisation';
import { OrganisationUser } from '../../entities/organisationUser';

import { User } from '../../entities/user';
import { RegisterWalletInput } from './RegisterWalletInput';
import { RegisterInput } from './RegisterInput';
// import { isAuth } from '../../middleware/isAuth'
// import { logger } from '../../middleware/logger'
import { sendEmail } from '../../utils/sendEmail';
import { createConfirmationUrl } from '../../utils/createConfirmationUrl';
import { Repository, getRepository } from 'typeorm';

@Resolver()
export class RegisterResolver {
  constructor(
    @InjectRepository(OrganisationUser)
    private readonly organisationUserRepository: Repository<OrganisationUser>,

    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
  ) {}

  @Mutation(() => User)
  async register(
    @Arg('data')
    { email, firstName, lastName, password }: RegisterInput,
  ): Promise<User> {
    logger.debug(`In Register Resolver : ${JSON.stringify(bcrypt, null, 2)}`);

    // const hashedPassword = await bcrypt.hash(password, 12)
    const hashedPassword = bcrypt.hashSync(password, 12);
    logger.debug(`hashedPassword ---> : ${hashedPassword}`);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      loginType: 'password',
    }).save();

    await sendEmail(email, await createConfirmationUrl(user.id));

    delete user.password;
    return user;
  }

  @Mutation(() => User)
  async registerWallet(
    @Arg('data')
    {
      email,
      name,
      firstName,
      lastName,
      walletAddress,
      organisationId,
    }: RegisterWalletInput,
  ): Promise<User> {
    const user = await User.create({
      firstName,
      lastName,
      email,
      name,
      walletAddress,
      loginType: 'wallet',
    });

    if (organisationId) {
      const organisation = await this.organisationRepository.find({
        where: { id: organisationId },
      });

      if (organisation) {
        user.organisations = [organisation[0]];
        const organisationUser = new OrganisationUser();
        organisationUser.role = 'donor';
        user.organisationUsers = [organisationUser];
        // TODO: The above isn't saving the role, but we don't need it right now #8 https://github.com/topiahq/impact-graph/issues/8

        user.save();
      } else {
        throw new Error('Organisation doesnt exist');
      }
    } else {
      throw new Error('User must be associated with an Organisation!');
    }

    if (email) {
      await sendEmail(email, await createConfirmationUrl(user.id));
    }

    return user;
  }
}
