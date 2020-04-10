import { buildSchema } from 'type-graphql'
import { OrganisationResolver } from '../resolvers/organisation-resolver'
import { NotificationResolver } from '../resolvers/notification-resolver'
import { UserResolver } from '../resolvers/user-resolver'
import { ProjectResolver } from '../resolvers/project-resolver'
import { RegisterResolver } from '../user/register/RegisterResolver'
import { LoginResolver } from '../user/LoginResolver'
import { ConfirmUserResolver } from '../user/ConfirmUserResolver'
import { MeResolver } from '../user/MeResolver'

export const createSchema = () =>
  buildSchema({
    resolvers: [
      UserResolver,
      ProjectResolver,
      OrganisationResolver,
      NotificationResolver,
      RegisterResolver,
      LoginResolver,
      ConfirmUserResolver,
      MeResolver
    ],
    authChecker: ({ context: { req } }) => {
      return !!req.session.userId
    }
  })
