import 'reflect-metadata'
import { ApolloServer } from 'apollo-server'
import { Container } from 'typedi'
import * as TypeORM from 'typeorm'
import * as TypeGraphQL from 'type-graphql'

import { User } from './entities/user'
import { Project } from './entities/project'
import { seedDatabase } from './helpers'
import { Organisation } from './entities/organisation'
import { OrganisationUser } from './entities/organisationUser'
import Notification from './entities/notification'
import { OrganisationProject } from './entities/organisationProject'

import { UserResolver } from './resolvers/user-resolver'
import { ProjectResolver } from './resolvers/project-resolver'
import { RegisterResolver } from './user/register/RegisterResolver'
import { LoginResolver } from './user/LoginResolver'
import { OrganisationResolver } from './resolvers/organisation-resolver'
import { NotificationResolver } from './resolvers/notification-resolver'
import { ConfirmUserResolver } from './user/ConfirmUserResolver'
import { MeResolver } from './user/MeResolver'

export interface Context {
  user: User
}

// register 3rd party IOC container
TypeORM.useContainer(Container)

async function bootstrap () {
  try {
    // create TypeORM connection
    await TypeORM.createConnection({
      type: 'postgres',
      database: 'topia_ql',
      username: 'topia_ql_user', // fill this with your username
      password: 'mypass', // and password
      port: 5432,
      host: 'localhost',
      entities: [
        Organisation,
        OrganisationUser,
        OrganisationProject,
        User,
        Project,
        Notification,
        RegisterResolver,
        LoginResolver,
        ConfirmUserResolver,
        MeResolver
      ],
      synchronize: true,
      logger: 'advanced-console',
      logging: 'all',
      dropSchema: true,
      cache: true
    })

    // seed database with some data
    const { defaultUser } = await seedDatabase()

    // build TypeGraphQL executable schema
    const schema = await TypeGraphQL.buildSchema({
      resolvers: [
        UserResolver,
        ProjectResolver,
        OrganisationResolver,
        NotificationResolver,
        RegisterResolver
      ],
      container: Container
    })

    // create mocked context
    const context: Context = { user: defaultUser }

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      schema,
      context
    })

    // Start the server
    const { url } = await apolloServer.listen(4000)
    console.log(`🚀 Server is running, GraphQL Playground available at ${url}`)
  } catch (err) {
    console.error(err)
  }
}

bootstrap()
