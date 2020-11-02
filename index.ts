import 'reflect-metadata'
import { ApolloServer } from 'apollo-server-express'
import { Container } from 'typedi'
import * as TypeORM from 'typeorm'
import * as TypeGraphQL from 'type-graphql'

import { User } from './entities/user'
import { BankAccount, StripeTransaction } from './entities/bankAccount'
import { Project, Category } from './entities/project'
import { seedDatabase } from './helpers'
import { Organisation } from './entities/organisation'
import { OrganisationUser } from './entities/organisationUser'
import Notification from './entities/notification'
// import { OrganisationProject } from './entities/organisationProject'

import { UserResolver } from './resolvers/userResolver'
import { ProjectResolver } from './resolvers/projectResolver'
import { BankAccountResolver } from './resolvers/bankAccountResolver'
import { RegisterResolver } from './user/register/RegisterResolver'
import { LoginResolver } from './user/LoginResolver'
import { OrganisationResolver } from './resolvers/organisationResolver'
import { NotificationResolver } from './resolvers/notificationResolver'
import { UploadResolver } from './resolvers/uploadResolver'
import { ConfirmUserResolver } from './user/ConfirmUserResolver'
import { MeResolver } from './user/MeResolver'
import { userCheck } from './auth/userCheck'
import * as jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'
import Config from './config'
import { handleStripeWebhook } from './utils/stripe'

dotenv.config()
const config = new Config(process.env)

// tslint:disable:no-var-requires
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

// register 3rd party IOC container
TypeORM.useContainer(Container)
const entities: any = [
  Organisation,
  OrganisationUser,
  User,
  Project,
  Notification,
  BankAccount,
  StripeTransaction,
  Category,
]
const resolvers: any = [
  UserResolver,
  ProjectResolver,
  OrganisationResolver,
  NotificationResolver,
  LoginResolver,
  RegisterResolver,
  MeResolver,
  BankAccountResolver,
  UploadResolver
]

if (process.env.REGISTER_USERNAME_PASSWORD === 'true') {
  resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver])
}

async function bootstrap () {
  try {
    // create TypeORM connection
    const dropSeed = config.get('DB_DROP_SEED') as boolean
    await TypeORM.createConnection({
      type: 'postgres',
      database: process.env.TYPEORM_DATABASE_NAME,
      username: process.env.TYPEORM_DATABASE_USER,
      password: process.env.TYPEORM_DATABASE_PASSWORD,
      port: Number(process.env.PORT),
      host: process.env.TYPEORM_DATABASE_HOST,
      entities,
      synchronize: true,
      logger: 'advanced-console',
      logging: 'all',
      dropSchema: dropSeed,
      cache: true
    })

    if (dropSeed) {
      // seed database with some data
      const { defaultUser } = await seedDatabase()
    }

    // build TypeGraphQL executable schema
    const schema = await TypeGraphQL.buildSchema({
      resolvers,
      container: Container,
      authChecker: userCheck
    })

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }: any) => {
        try {
          if (!req) {
            return null
          }
          
          if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1].toString()
            const secret = config.get('JWT_SECRET') as string

            const decodedJwt: any = jwt.verify(token, secret)

            let user
            if (decodedJwt.nextAuth) {
              user = {
                email: decodedJwt?.nextauth?.user?.email,
                name: decodedJwt?.nextauth?.user?.name
              }
            } else {
              user = {
                email: decodedJwt?.email,
                name: decodedJwt?.firstName,
                userId: decodedJwt?.userId
              }
            }

            req.user = user
          }
        } catch (error) {
          console.error(
            `Apollo Server error : ${JSON.stringify(error, null, 2)}`
          )
        }

        return {
          req,
          res
        }
      },
      engine: {
        reportSchema: true
      },
      playground: {
        endpoint: '/'
      },
      uploads: {
        maxFileSize: config.get('UPLOAD_FILE_MAX_SIZE') as number || 2000000
      }
    })

    // Express Server
    const app = express();
    
    app.use(cors())
    apolloServer.applyMiddleware({ app });
    app.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), handleStripeWebhook);

    // Start the server
    app.listen({ port: 4000 })
    console.log(`🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}`)
  } catch (err) {
    console.error(err)
  }
}

bootstrap()
