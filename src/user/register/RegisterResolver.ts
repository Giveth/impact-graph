import { Resolver, Mutation, Arg } from 'type-graphql';
import * as bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { User } from '../../entities/user';
import { RegisterInput } from './RegisterInput';
// import { isAuth } from '../../middleware/isAuth'
// import { logger } from '../../middleware/logger'
import { sendEmail } from '../../utils/sendEmail';
import { createConfirmationUrl } from '../../utils/createConfirmationUrl';

@Resolver()
export class RegisterResolver {
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
}
