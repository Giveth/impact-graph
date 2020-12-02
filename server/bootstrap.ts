import config from '../config';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import { handleStripeWebhook } from '../utils/stripe';
import createSchema from './createSchema';


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
                try {
                    if (!req) {
                        return null
                    }

                    const { headers } = req;
                    if (headers.authorization) {
                        const token = headers.authorization.split(' ')[1].toString()
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

                    const userWalletAddress = headers['wallet-address']
                    if (userWalletAddress) {
                        req.userwalletAddress = userWalletAddress
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
                endpoint: '/graphql'
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
        app.get('/project', (req, res) => { 
            res.send({
                balance: 0,
                id: 24,
                title: 'James test project',
                slug: 'James-test-project',
                admin: '17',
                description: 'This is a super cool description!!!!',
                organisationId: 1212121212,
                coOrdinates: '0.342434, 0.3434343',
                image: 'https://ipfs.giveth.io/ipfs/QmYx4eCHQFLJNEKWLjFQGR8hisEtdDbYqGKHSmCWuRvufa',
                impactLocation: null,
                stripeAccountId: null,
                walletAddress: '0xD2CAc44B9d072A0D6bD39482147d894f13C5CF32',
                categories: ['carbon', 'biodiversity']
              }) 
          }) 
        // Start the server
        app.listen({ port: 4000 })
        console.log(`🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`)
    } catch (err) {
        console.error(err)
    }
}