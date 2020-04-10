import 'reflect-metadata'
import { ApolloServer } from 'apollo-server-express'
import { Container } from 'typedi'
import * as TypeORM from 'typeorm'
import * as TypeGraphQL from 'type-graphql'

import express from 'express'
import connectRedis from 'connect-redis'
import session from 'express-session'
import cors from 'cors'
import { redis } from './redis'
import connect from 'connect'

import { UserResolver } from './resolvers/user-resolver'
import { ProjectResolver } from './resolvers/project-resolver'
import { User } from './entities/user'
import { Project } from './entities/project'
import { seedDatabase } from './helpers'
import { Organisation } from './entities/organisation'
import { OrganisationUser } from './entities/organisationUser'
import Notification from './entities/notification'
import { OrganisationProject } from './entities/organisationProject'
import { OrganisationResolver } from './resolvers/organisation-resolver'
import { NotificationResolver } from './resolvers/notification-resolver'
import { RegisterResolver } from './user/register/RegisterResolver'
import { LoginResolver } from './user/LoginResolver'
import { ConfirmUserResolver } from './user/ConfirmUserResolver'
import { MeResolver } from './user/MeResolver'

import { createSchema } from './schema/create'

export interface Context {
  user: User
}

// register 3rd party IOC container
TypeORM.useContainer(Container)

async function main () {
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
        Notification
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
        RegisterResolver,
        LoginResolver,
        ConfirmUserResolver,
        MeResolver
      ],
      container: Container
    })
    // const schema = await createSchema()
    // create mocked context
    const context: Context = { user: defaultUser }

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }: any) => ({
        req,
        res
        // authorsLoader: createAuthorsLoader()
      })
    })

    const app = express()
    let RedisStore = connectRedis(session)

    app.use(
      cors({
        credentials: true,
        origin: 'http://localhost:3000'
      })
    )

    app.use(
      session({
        store: new RedisStore({
          client: redis as any
        }),
        name: 'qid',
        secret: 'aslkdfjoiq12312',
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          domain: 'localhost',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
        }
      })
    )

    apolloServer.applyMiddleware({ app, cors: false })

    app.listen({ port: 4000 }, () =>
      console.log(
        `🚀 Server ready at http://localhost:4000${apolloServer.graphqlPath}`
      )
    )
  } catch (err) {
    console.error(err)
  }
}

main()
