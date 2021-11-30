import config from '../config'
import { ApolloServer } from 'apollo-server-express'
import * as jwt from 'jsonwebtoken'
import * as TypeORM from 'typeorm'
import { json } from 'express'
import { handleStripeWebhook } from '../utils/stripe'
import { netlifyDeployed } from '../netlify/deployed'
import createSchema from './createSchema'
import { resolvers } from '../resolvers/resolvers'
import { entities } from '../entities/entities'
import { Container } from 'typedi'
import { RegisterResolver } from '../user/register/RegisterResolver'
import { ConfirmUserResolver } from '../user/ConfirmUserResolver'

import Logger from '../logger'
import { graphqlUploadExpress } from 'graphql-upload'
import { Database, Resource } from '@admin-bro/typeorm';
import { validate } from 'class-validator'

import { Project, ProjStatus } from '../entities/project'
import { ProjectStatus } from '../entities/projectStatus';
import { User } from '../entities/user';

import AdminBro from 'admin-bro';
import { runCheckPendingDonationsCronJob } from '../services/syncDonationsWithNetwork';
import { webhookHandler } from '../services/transak/webhookHandler';

const AdminBroExpress = require('@admin-bro/express')

// tslint:disable:no-var-requires
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const bcrypt = require('bcrypt')
const segmentProjectStatusEvents = {
  'act': 'activated',
  'can': 'deactivated',
  'del': 'cancelled'
}

// register 3rd party IOC container

Resource.validate = validate;
AdminBro.registerAdapter({ Database, Resource });

export async function bootstrap () {
  try {
    TypeORM.useContainer(Container)

    if (config.get('REGISTER_USERNAME_PASSWORD') === 'true') {
      resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver])
    }
  
    const dropSchema = config.get('DROP_DATABASE') === 'true'
    const dbConnection = await TypeORM.createConnection({
      type: 'postgres',
      database: config.get('TYPEORM_DATABASE_NAME') as string,
      username: config.get('TYPEORM_DATABASE_USER') as string,
      password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
      port: config.get('TYPEORM_DATABASE_PORT') as number,
      host: config.get('TYPEORM_DATABASE_HOST') as string,
      entities,
      synchronize: true,
      logger: 'advanced-console',
      logging: ['error'],
      dropSchema,
      cache: true,
    })

    const schema = await createSchema()

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      uploads: false,
      schema,
      context: ({ req, res }: any) => {
        let token
        try {
          if (!req) {
            return null
          }

          const { headers } = req
          if (headers.authorization) {
            token = headers.authorization.split(' ')[1].toString()
            const secret = config.get('JWT_SECRET') as string

            const decodedJwt: any = jwt.verify(token, secret)

            let user
            if (decodedJwt.nextAuth) {
              user = {
                email: decodedJwt?.nextauth?.user?.email,
                name: decodedJwt?.nextauth?.user?.name,
                token
              }
            } else {
              user = {
                email: decodedJwt?.email,
                name: decodedJwt?.firstName,
                userId: decodedJwt?.userId,
                token
              }
            }

            req.user = user
          }

          const userWalletAddress = headers['wallet-address']
          if (userWalletAddress) {
            req.userwalletAddress = userWalletAddress
          }
        } catch (error) {
          // console.error(
          //   `Apollo Server error : ${JSON.stringify(error, null, 2)}`
          // )
          // Logger.captureMessage(
          //   `Error with with token, check pm2 logs and search for - Error for token - to get the token`
          // )
          // console.error(`Error for token - ${token}`)
          req.auth = {}
          req.auth.token = token
          req.auth.error = error
          // console.log(`ctx.req.auth : ${JSON.stringify(ctx.req.auth, null, 2)}`)
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
        endpoint: '/graphql'
      },
      introspection: true
    })

    // Express Server
    const app = express()

    app.use(cors())
    app.use(bodyParser.json())
    app.use('/graphql',
      json({ limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 4000000 })
    )
    app.use(
      '/graphql',
      graphqlUploadExpress({
        maxFileSize: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 2000000,
        maxFiles: 10
      })
    )
    apolloServer.applyMiddleware({ app })
    app.post(
      '/stripe-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleStripeWebhook
    )
    app.post(
      '/netlify-build',
      bodyParser.raw({ type: 'application/json' }),
      netlifyDeployed
    )
    app.post('/transak_webhook', webhookHandler)

    // Start the server
    app.listen({ port: 4000 })
    console.log(
      `🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`
    )


    // Admin Bruh!
    Project.useConnection(dbConnection);
    ProjectStatus.useConnection(dbConnection)
    User.useConnection(dbConnection)
    runCheckPendingDonationsCronJob()

    const listDelist =async(context, request, list = true)=> {
      const { h, resource, records } = context
      try {
        const projects = await Project.createQueryBuilder('project')
        .update<Project>(Project, {listed: list})
        .where('project.id IN (:...ids)')
        .setParameter('ids', request.query.recordIds.split(','))
        .returning('*')
        .updateEntity(true)
        .execute()

        projects.raw.forEach(project => {
          Project.notifySegment(
            project,
            `Project ${list ? 'listed' : 'unlisted'}`
          )
        })
      } catch (error) {
        throw error
      }
      return {
        redirectUrl: 'Project',
        records: records.map(record => {
          record.toJSON(context.currentAdmin)
        }),
        notice: {
          message: `Project(s) successfully ${list ? 'listed' : 'unlisted'}`,
          type: 'success',
        }
      }
    }

    const verifyProjects =async(context, request, verified = true)=> {
      const { h, resource, records } = context
      try {
        const projects = await Project.createQueryBuilder('project')
        .update<Project>(Project, {verified: verified})
        .where('project.id IN (:...ids)')
        .setParameter('ids', request.query.recordIds.split(','))
        .returning('*')
        .updateEntity(true)
        .execute()

        projects.raw.forEach(project => {
          Project.notifySegment(
            project,
            `Project ${verified? 'verified' : 'unverified'}`)
        })
      } catch (error) {
        throw error
      }
      return {
        redirectUrl: 'Project',
        records: records.map(record => {
          record.toJSON(context.currentAdmin)
        }),
        notice: {
          message: `Project(s) successfully ${verified ? 'verified' : 'unverified'}`,
          type: 'success',
        }
      }
    }

    const updateStatuslProjects =async(context, request, status)=> {
      const { h, resource, records } = context
      try {
        const projectStatus = await ProjectStatus.findOne({ id: status })
        if(projectStatus) {
          const projects = await Project.createQueryBuilder('project')
          .update<Project>(Project, {status: projectStatus})
          .where('project.id IN (:...ids)')
          .setParameter('ids', request.query.recordIds.split(','))
          .returning('*')
          .updateEntity(true)
          .execute()

          projects.raw.forEach(project => {
            Project.notifySegment(
              project,
              `Project ${segmentProjectStatusEvents[projectStatus.symbol]}`
            )
          })
        }

      } catch (error) {
        throw error
      }

      return {
        redirectUrl: 'Project',
        records: records.map(record => {
          record.toJSON(context.currentAdmin)
        }),
        notice: {
          message: `Project(s) status successfully updated`,
          type: 'success',
        }
      }
    }

    const adminBro = new AdminBro({
      // databases: [connection],
      branding: {
        logo: 'https://i.imgur.com/cGKo1Tk.png',
        favicon: 'https://icoholder.com/media/cache/ico_logo_view_page/files/img/e15c430125a607a604a3aee82e65a8f7.png',
        companyName: 'Giveth',
        softwareBrothers: false
      },
      resources: [
        { 
          resource: Project, 
          options: {
            properties: {
              id: {
                isVisible: { list: false, filter: false, show: true, edit: false },
              },
              admin: {
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              description: {
                isVisible: { list: false, filter: false, show: false, edit: true },
              },
              slug: {
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              organisationId: {
                isVisible: false
              },
              coOrdinates: {
                isVisible: false
              },
              image: {
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              balance: {
                isVisible: { list: false, filter: false, show: true, edit: false },
              },
              giveBacks: {
                isVisible: false,
              },
              stripeAccountId: {
                isVisible: { list: false, filter: false, show: true, edit: false },
              },
              walletAddress: {
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              impactLocation: {
                isVisible: { list: false, filter: true, show: true, edit: true },
              },
              slugHistory: {
                isVisible: false
              }
            },
            actions: {
              delete: {
                isVisible: false
              },
              bulkDelete: {
                isVisible: false
              },
              listProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return listDelist(context, request, true)
                },
                component: false,
              },
              delistProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return listDelist(context, request, false)
                },
                component: false,
              },
              verifyProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return verifyProjects(context, request, true)
                },
                component: false,
              },
              unverifyProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return verifyProjects(context, request, false)
                },
                component: false,
              },
              activateProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return updateStatuslProjects(context, request, ProjStatus.active)
                },
                component: false,
              },
              deactivateProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return updateStatuslProjects(context, request, ProjStatus.deactive)
                },
                component: false,
              },
              cancelProject: {
                actionType: 'bulk',
                isVisible: true,
                handler: async (request, response, context) => {
                  return updateStatuslProjects(context, request, ProjStatus.cancel)
                },
                component: false,
              }
            }
          }
        },
        { resource: ProjectStatus, options: {
            actions: {
              delete: {
                isVisible: false
              },
              bulkDelete: {
                isVisible: false
              },
            },
          }
        },
        {
          resource: User,
          options: {
            properties: {
              encryptedPassword: {
                isVisible: false,
              },
              avatar: {
                isVisible: false
              },
              password: {
                type: 'string',
                isVisible: {
                  list: false, edit: true, filter: false, show: false,
                },
                // isVisible: false,
              },
            },
            actions: {
              delete: {
                isVisible: false
              },
              bulkDelete: {
                isVisible: false
              },
              new: {
                before: async (request) => {
                  if(request.payload.password) {
                    const bc =  await bcrypt.hash(request.payload.password, parseInt(process.env.BCRYPT_SALT!))
                    request.payload = {
                      ...request.payload,
                      encryptedPassword: bc,
                      password: null,
                    }
                  }
                  return request
                }
              },
              edit: {
                before: async (request) => {
                  console.log({request: request.payload})
                  if(request.payload.password) {
                    const bc =  await bcrypt.hash(request.payload.password, parseInt(process.env.BCRYPT_SALT!))
                    request.payload = {
                      ...request.payload,
                      encryptedPassword: bc,
                      password: null,
                    }
                  }
                  return request
                }
              }
            }
          }
        }
    ],
      rootPath: '/admin',
    });
    // const router = AdminBroExpress.buildRouter(adminBro)
    const router = AdminBroExpress.buildAuthenticatedRouter(adminBro, {
      authenticate: async (email, password) => {
        try {
          const user = await User.findOne({ email })
          if (user) {
            const matched = await bcrypt.compare(password, user.encryptedPassword)
            if (matched) {
              return user
            }
          }
          return false
        }catch (e) {
          console.log({e})
          return false
        }
      },
      cookiePassword:  config.get('ADMIN_BRO_COOKIE_SECRET'),
    })

    app.use(adminBro.options.rootPath, router)

    app.use(
      json({ limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 4000000 })
    )

  } catch (err) {
    console.error(err)
  }
}
