import { User } from '../entities/user';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { Repository } from 'typeorm';
import { Service } from 'typedi';
import { errorMessages } from '../utils/errorMessages';

@Service()
export class UserPermissions {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async mayAddProjectToOrganisation(email, organisationId) {
    console.log(`organisationId ---> : ${organisationId}`);
    console.log(`email ---> : ${email}`);
    const user = await this.userRepository.findOne({
      relations: ['organisations'],
      where: {
        email,
      },
    });

    if (user) {
      if (user.organisations.length) {
        if (user.organisations.filter(o => o.id === organisationId).length) {
          return true;
        } else {
          throw new Error('User is not a member of that organisations');
        }
      } else {
        throw new Error('User is not a member of any organisations');
      }
    } else {
      throw new Error(errorMessages.USER_NOT_FOUND);
    }
  }
}
