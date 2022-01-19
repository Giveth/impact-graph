import config from '../config';
import RateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { ApolloServer } from 'apollo-server-express';
import * as jwt from 'jsonwebtoken';
import * as TypeORM from 'typeorm';
import { json, Request, Response } from 'express';
import { handleStripeWebhook } from '../utils/stripe';
import { netlifyDeployed } from '../netlify/deployed';
import createSchema from './createSchema';
import { resolvers } from '../resolvers/resolvers';
import { entities } from '../entities/entities';
import { Container } from 'typedi';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { ConfirmUserResolver } from '../user/ConfirmUserResolver';
import { graphqlUploadExpress } from 'graphql-upload';
import { Resource } from '@admin-bro/typeorm';
import { validate } from 'class-validator';

import { runCheckPendingDonationsCronJob } from '../services/syncDonationsWithNetwork';
import { runCheckPendingProjectListingCronJob } from '../services/syncProjectsRequiredForListing';
import { webhookHandler } from '../services/transak/webhookHandler';

import { adminBroRootPath, getAdminBroRouter } from './adminBro';
import { runGivingBlocksProjectSynchronization } from '../services/the-giving-blocks/syncProjectsCronJob';
import { initHandlingTraceCampaignUpdateEvents } from '../services/trace/traceService';
import { processSendSegmentEventsJobs } from '../analytics/segmentQueue';
import { runUpdateHistoricGivPrices } from '../services/syncGivPrices';
import { redis } from '../redis';
import { logger } from '../utils/logger';

// tslint:disable:no-var-requires
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// register 3rd party IOC container

Resource.validate = validate;
// AdminBro.registerAdapter({ Database, Resource });

export async function bootstrap() {
  try {
    TypeORM.useContainer(Container);

    if (config.get('REGISTER_USERNAME_PASSWORD') === 'true') {
      resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver]);
    }

    const dropSchema = config.get('DROP_DATABASE') === 'true';
    await TypeORM.createConnection({
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
    });

    const schema = await createSchema();

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      uploads: false,
      schema,
      context: ({ req, res }: any) => {
        let token;
        try {
          if (!req) {
            return null;
          }

          const { headers } = req;
          if (headers.authorization) {
            token = headers.authorization.split(' ')[1].toString();
            const secret = config.get('JWT_SECRET') as string;

            const decodedJwt: any = jwt.verify(token, secret);

            let user;
            if (decodedJwt.nextAuth) {
              user = {
                email: decodedJwt?.nextauth?.user?.email,
                name: decodedJwt?.nextauth?.user?.name,
                token,
              };
            } else {
              user = {
                email: decodedJwt?.email,
                name: decodedJwt?.firstName,
                userId: decodedJwt?.userId,
                token,
              };
            }

            req.user = user;
          }

          const userWalletAddress = headers['wallet-address'];
          if (userWalletAddress) {
            req.userwalletAddress = userWalletAddress;
          }
        } catch (error) {
          // console.error(
          //   `Apollo Server error : ${JSON.stringify(error, null, 2)}`
          // )
          // Logger.captureMessage(
          //   `Error with with token, check pm2 logs and search for - Error for token - to get the token`
          // )
          // console.error(`Error for token - ${token}`)
          req.auth = {};
          req.auth.token = token;
          req.auth.error = error;
          // logger.debug(`ctx.req.auth : ${JSON.stringify(ctx.req.auth, null, 2)}`)
        }

        return {
          req,
          res,
        };
      },
      engine: {
        reportSchema: true,
      },
      playground:
        process.env.DISABLE_APOLLO_PLAYGROUND === 'true'
          ? false
          : {
              endpoint: '/graphql',
            },
      introspection: true,
    });

    // Express Server
    const app = express();
    const whitelistHostnames: string[] = (
      config.get('HOSTNAME_WHITELIST') as string
    ).split(',');
    const corsOptions = {
      origin(origin, callback) {
        if (!origin) {
          // allow requests with no origin (like mobile apps, Curl, ...)
          return callback(null, true);
        }

        // removing http:// , https://, and :port
        const formattedOrigin = origin
          .replace('https://', '')
          .replace('http://', '')
          .split(':')[0];

        for (const allowedOrigin of whitelistHostnames) {
          // passing all subdomains of whitelist hosts, for instance x.vercel.app, x.giveth.io,...
          if (
            formattedOrigin === allowedOrigin ||
            formattedOrigin.endsWith(`.${allowedOrigin}`)
          ) {
            return callback(null, true);
          }
        }

        logger.error('CORS error', { whitelistHostnames, origin });
        callback(new Error('Not allowed by CORS'));
      },
    };
    app.use(cors(corsOptions));
    app.use(bodyParser.json());
    const limiter = new RateLimit({
      store: new RedisStore({
        prefix: 'rate-limit:',
        client: redis,
        // see Configuration
      }),
      windowMs: 1 * 60 * 1000, // 1 minutes
      max: Number(process.env.ALLOWED_REQUESTS_PER_MINUTE), // limit each IP to 40 requests per windowMs
      skip: (req: Request, res: Response) => {
        const vercelKey = process.env.VERCEL_KEY;
        if (vercelKey && req.headers.vercel_key === vercelKey) {
          // Skip rate-limit for Vercel requests because our front is SSR
          return true;
        }
        return false;
      },
    });
    app.use(limiter);
    app.use(
      '/graphql',
      json({
        limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 4000000,
      }),
    );
    app.use(
      '/graphql',
      graphqlUploadExpress({
        maxFileSize: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 2000000,
        maxFiles: 10,
      }),
    );
    apolloServer.applyMiddleware({ app });
    app.post(
      '/stripe-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleStripeWebhook,
    );
    app.post(
      '/netlify-build',
      bodyParser.raw({ type: 'application/json' }),
      netlifyDeployed,
    );
    app.post('/transak_webhook', webhookHandler);

    // Start the server
    app.listen({ port: 4000 });
    logger.debug(
      `🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`,
    );

    // Admin Bruh!
    app.use(adminBroRootPath, getAdminBroRouter());

    app.use(
      json({
        limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 4000000,
      }),
    );
    runCheckPendingDonationsCronJob();
    runCheckPendingProjectListingCronJob();
    processSendSegmentEventsJobs();
    initHandlingTraceCampaignUpdateEvents();
    runUpdateHistoricGivPrices();

    // If we need to deactivate the process use the env var
    if ((config.get('GIVING_BLOCKS_SERVICE_ACTIVE') as string) === 'true') {
      runGivingBlocksProjectSynchronization();
    }
  } catch (err) {
    logger.error(err);
  }
}
