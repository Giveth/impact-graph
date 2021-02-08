import config from '../config';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { handleStripeWebhook } from '../utils/stripe';
import { netlifyDeployed } from '../netlify/deployed';
import createSchema from './createSchema';
import Logger from '../logger'

// tslint:disable:no-var-requires
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

// register 3rd party IOC container


export async function bootstrap() {
    try {
        const schema = await createSchema()

        // Create GraphQL server
        const apolloServer = new ApolloServer({
            schema,
            context: ({ req, res }: any) => {
                let token
                try {
                    if (!req) {
                        return null
                    }

                    const { headers } = req;
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
                    console.error(
                        `Apollo Server error : ${JSON.stringify(error, null, 2)}`
                    )
                    Logger.captureMessage(`Error with with token, check pm2 logs and search for - Error for token - to get the token`);
                    console.error(`Error for token ${token}`)
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
            uploads: {
                maxFileSize: config.get('UPLOAD_FILE_MAX_SIZE') as number || 2000000
            },
            introspection: true
        })

        // Express Server
        const app = express();

        app.use(cors())
        apolloServer.applyMiddleware({ app });
        app.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), handleStripeWebhook);
        app.post('/netlify-build', bodyParser.raw({ type: 'application/json' }), netlifyDeployed);
        
        // Start the server
        app.listen({ port: 4000 })
        console.log(`🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`)
    } catch (err) {
        console.error(err)
    }
}