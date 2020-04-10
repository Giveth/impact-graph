import { buildSchema } from 'type-graphql'
import { OrganisationResolver } from '../resolvers/organisation-resolver'
import { NotificationResolver } from '../resolvers/notification-resolver'
import { UserResolver } from '../resolvers/user-resolver'
import { ProjectResolver } from '../resolvers/project-resolver'
import { RegisterResolver } from '../user/register/RegisterResolver'
const { gql } = require('apollo-server-express')

export const createSchema = () =>
  buildSchema({
    resolvers: [
      UserResolver,
      ProjectResolver,
      OrganisationResolver,
      NotificationResolver
    ],
    authChecker: ({ context: { req } }) => {
      return !!req.session.userId
    }
  })

// export const createSchema = () =>
//   gql`
//     type Query {
//       hello: String
//     }
//   `
