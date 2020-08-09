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
  OrganisationProject,
  User,
  Project,
  Notification,
  MeResolver
]
let resolvers: any = [
  UserResolver,
  ProjectResolver,
  OrganisationResolver,
  NotificationResolver,
  LoginResolver,
  RegisterResolver
]
console.log(`resolvers.length ---> : ${resolvers.length}`)
if (process.env.REGISTER_USERNAME_PASSWORD === 'true') {
  console.log(
    `process.env.REGISTER_USERNAME_PASSWORD ---> : ${process.env.REGISTER_USERNAME_PASSWORD}`
  )
  console.log('RegisterResolver')

  resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver])
}
console.log(`resolvers.length ---> : ${resolvers.length}`)

console.log(`resolvers : ${JSON.stringify(resolvers, null, 2)}`)

async function bootstrap () {
  try {
    // create TypeORM connection
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
      dropSchema: true,
      cache: true
    })

    // seed database with some data
    const { defaultUser } = await seedDatabase()

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
            console.log('Authorized request ')

            const token = req.headers.authorization.split(' ')[1].toString()
            const secret = config.get('JWT_SECRET')

            const decodedJwt: any = jwt.verify(token, secret)
            const user = {
              email: decodedJwt?.nextauth?.user?.email,
              name: decodedJwt?.nextauth?.user?.name
            }
            req.user = user
            // console.log(`req.user : ${JSON.stringify(req.user, null, 2)}`)
          }
        } catch (error) {
          console.log(`Apollo Server error : ${JSON.stringify(error, null, 2)}`)
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
