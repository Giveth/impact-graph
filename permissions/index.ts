import { User } from '../entities/user'
import { InjectRepository } from 'typeorm-typedi-extensions'
import { Repository } from 'typeorm'
import { Service } from 'typedi'

@Service()
export class UserPermissions {
  constructor (
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async mayAddProjectToOrganisation (email, organisationId) {
    console.log(`organisationId ---> : ${organisationId}`)

    let user = await this.userRepository.findOne({
      relations: ['organisations'],
      where: {
        email: email
      }
    })

    if (user) {
      console.log(`user !!!: ${JSON.stringify(user, null, 2)}`)
      if (user.organisations.length) {
        if (user.organisations.filter(o => o.id === organisationId).length) {
          console.log('Success')

          return true
        } else {
          throw new Error('User is not a member of that organisations')
        }
      } else {
        throw new Error('User is not a member of any organisations')
      }
    } else {
      throw new Error('User not found')
    }
  }
}
