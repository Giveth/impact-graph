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
//import { OrganisationProject } from './entities/organisationProject'

import { UserResolver } from './resolvers/userResolver'
import { ProjectResolver } from './resolvers/projectResolver'
import { RegisterResolver } from './user/register/RegisterResolver'
import { LoginResolver } from './user/LoginResolver'
import { OrganisationResolver } from './resolvers/organisationResolver'
import { NotificationResolver } from './resolvers/notificationResolver'
import { ConfirmUserResolver } from './user/ConfirmUserResolver'
import { MeResolver } from './user/MeResolver'
import { userCheck } from './auth/userCheck'
import * as jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'
import Config from './config'

dotenv.config()
const config = new Config(process.env)

// register 3rd party IOC container
TypeORM.useContainer(Container)
let entities: any = [
  Organisation,
  OrganisationUser,
  User,
  Project,
  Notification
]
let resolvers: any = [
  UserResolver,
  ProjectResolver,
  OrganisationResolver,
  NotificationResolver,
  LoginResolver,
  RegisterResolver,
  MeResolver
]

if (process.env.REGISTER_USERNAME_PASSWORD === 'true') {
  resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver])
}

async function bootstrap () {
  try {
    // create TypeORM connection
    const dropSeed = config.get('DB_DROP_SEED') == 'true'
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
            const secret = config.get('JWT_SECRET')

            const decodedJwt: any = jwt.verify(token, secret)
            const user = {
              email: decodedJwt?.nextauth?.user?.email,
              name: decodedJwt?.nextauth?.user?.name
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
      }
    })

    // Start the server
    const { url } = await apolloServer.listen(4000)
    console.log(`🚀 Server is running, GraphQL Playground available at ${url}`)
  } catch (err) {
    console.error(err)
  }
}

bootstrap()
