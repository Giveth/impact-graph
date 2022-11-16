import config from '../config';
import RateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { ApolloServer } from 'apollo-server-express';
import * as TypeORM from 'typeorm';
import { json, Request, response, Response } from 'express';
import { handleStripeWebhook } from '../utils/stripe';
import createSchema from './createSchema';
import { resolvers } from '../resolvers/resolvers';
import { entities } from '../entities/entities';
import { Container } from 'typedi';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { ConfirmUserResolver } from '../user/ConfirmUserResolver';
import { graphqlUploadExpress } from 'graphql-upload';
import { Resource } from '@admin-bro/typeorm';
import { validate } from 'class-validator';
import SentryLogger from '../sentryLogger';

import { runCheckPendingDonationsCronJob } from '../services/cronJobs/syncDonationsWithNetwork';
import { runCheckPendingProjectListingCronJob } from '../services/cronJobs/syncProjectsRequiredForListing';
import { runCheckProjectVerificationStatus } from '../services/cronJobs/checkProjectVerificationStatus';
import { webhookHandler } from '../services/transak/webhookHandler';
import { onramperWebhookHandler } from '../services/onramper/webhookHandler';

import {
  adminBroRootPath,
  getAdminBroRouter,
  adminBroQueryCache,
} from './adminBro';
import { redis } from '../redis';
import { logger } from '../utils/logger';
import { runNotifyMissingDonationsCronJob } from '../services/cronJobs/notifyDonationsWithSegment';
import {
  errorMessages,
  i18n,
  setI18nLocaleForRequest,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { runSyncPoignArtDonations } from '../services/poignArt/syncPoignArtDonationCronJob';
import { apiGivRouter } from '../routers/apiGivRoutes';
import { runUpdateDonationsWithoutValueUsdPrices } from '../services/cronJobs/fillOldDonationsPrices';
import { authorizationHandler } from '../services/authorizationServices';
import {
  oauth2CallbacksRouter,
  SOCIAL_PROFILES_PREFIX,
} from '../routers/oauth2Callbacks';
import { SOCIAL_NETWORKS, SocialProfile } from '../entities/socialProfile';
import { getSocialNetworkAdapter } from '../adapters/adaptersFactory';
import { SegmentAnalyticsSingleton } from '../services/segment/segmentAnalyticsSingleton';
import { CronJob } from '../entities/CronJob';
import {
  dropDbCronExtension,
  schedulePowerBoostingSnapshot,
} from '../repositories/dbCronRepository';
import { runFillBlockNumbersOfSnapshotsCronjob } from '../services/cronJobs/fillBlockNumberOfPoweSnapShots';
import { runFillPowerSnapshotBalanceCronJob } from '../services/cronJobs/fillSnapshotBalances';
import { runUpdatePowerRoundCronJob } from '../services/cronJobs/updatePowerRoundJob';

// tslint:disable:no-var-requires
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// register 3rd party IOC container

Resource.validate = validate;

export async function bootstrap() {
  try {
    TypeORM.useContainer(Container);

    if (config.get('REGISTER_USERNAME_PASSWORD') === 'true') {
      resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver]);
    }

    const dropSchema = config.get('DROP_DATABASE') === 'true';
    await TypeORM.createConnections([
      {
        name: 'default',
        schema: 'public',
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
      },
      {
        name: 'cron',
        type: 'postgres',
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
        port: config.get('TYPEORM_DATABASE_PORT') as number,
        host: config.get('TYPEORM_DATABASE_HOST') as string,
        entities: [CronJob],
        synchronize: false,
        dropSchema: false,
      },
    ]);

    if (dropSchema) {
      try {
        await dropDbCronExtension();
      } catch (e) {
        logger.error('drop pg_cron extension error', e);
      }
    }

    const schema = await createSchema();

    const enableDbCronJob =
      config.get('ENABLE_DB_POWER_BOOSTING_SNAPSHOT') === 'true';
    if (enableDbCronJob) {
      try {
        const scheduleExpression = config.get(
          'DB_POWER_BOOSTING_SNAPSHOT_CRONJOB_EXPRESSION',
        ) as string;
        await schedulePowerBoostingSnapshot(scheduleExpression);
      } catch (e) {
        logger.error('Enabling power boosting snapshot ', e);
      }
    }

    // Create GraphQL server
    const apolloServer = new ApolloServer({
      uploads: false,
      schema,
      context: async ({ req, res }: any) => {
        let token: string = '';
        try {
          if (!req) {
            return null;
          }

          const { headers } = req;
          const authVersion = headers.authversion || '1';
          if (headers.authorization) {
            token = headers.authorization.split(' ')[1].toString();
            const user = await authorizationHandler(authVersion, token);
            req.user = user;
          }
        } catch (error) {
          SentryLogger.captureException(`Error: ${error} for token ${token}`);
          logger.error(
            `Error: ${error} for token ${token} authVersion ${
              req?.headers?.authversion || '1'
            }`,
          );
          req.auth = {};
          req.auth.token = token;
          req.auth.error = error;
        }

        return {
          req,
          res,
        };
      },
      formatError: err => {
        /**
         * @see {@link https://www.apollographql.com/docs/apollo-server/data/errors/#for-client-responses}
         */
        // Don't give the specific errors to the client.

        if (
          err?.message?.includes(process.env.TYPEORM_DATABASE_HOST as string)
        ) {
          logger.error('DB connection error', err);
          SentryLogger.captureException(err);
          return new Error(
            i18n.__(translationErrorMessagesKeys.INTERNAL_SERVER_ERROR),
          );
        } else if (err?.message?.startsWith('connect ECONNREFUSED')) {
          // It could be error connecting DB, Redis, ...
          logger.error('Apollo server client error', err);
          SentryLogger.captureException(err);
          return new Error(
            i18n.__(translationErrorMessagesKeys.INTERNAL_SERVER_ERROR),
          );
        }

        // Otherwise return the original error. The error can also
        // be manipulated in other ways, as long as it's returned.
        return err;
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
    app.use(setI18nLocaleForRequest); // accept-language header
    app.use(cors(corsOptions));
    app.use(
      bodyParser.json({
        limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '5mb',
      }),
    );
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
        if (req.url.startsWith('/admin')) {
          // Bypass Admin bro panel request
          return true;
        }
        return false;
      },
    });
    app.use(limiter);
    app.use(
      '/graphql',
      json({
        limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '10mb',
      }),
    );
    app.use(
      '/graphql',
      graphqlUploadExpress({
        maxFileSize: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 2000000,
        maxFiles: 10,
      }),
    );
    app.use('/apigive', apiGivRouter);
    app.use(SOCIAL_PROFILES_PREFIX, oauth2CallbacksRouter);
    apolloServer.applyMiddleware({ app });
    app.post(
      '/stripe-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleStripeWebhook,
    );
    app.get('/health', (req, res, next) => {
      res.send('Hi every thing seems ok');
    });
    app.post('/fiat_webhook', onramperWebhookHandler);
    app.post('/transak_webhook', webhookHandler);

    // Start the server
    app.listen({ port: 4000 });
    logger.debug(
      `🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`,
    );

    // Admin Bruh!
    app.use(adminBroQueryCache);
    app.use(adminBroRootPath, await getAdminBroRouter());

    runCheckPendingDonationsCronJob();
    runNotifyMissingDonationsCronJob();
    runCheckPendingProjectListingCronJob();
    runUpdateDonationsWithoutValueUsdPrices();

    if ((config.get('PROJECT_REVOKE_SERVICE_ACTIVE') as string) === 'true') {
      runCheckProjectVerificationStatus();
    }

    // If we need to deactivate the process use the env var NO MORE
    // if ((config.get('GIVING_BLOCKS_SERVICE_ACTIVE') as string) === 'true') {
    //   runGivingBlocksProjectSynchronization();
    // }
    if ((config.get('POIGN_ART_SERVICE_ACTIVE') as string) === 'true') {
      runSyncPoignArtDonations();
    }
    if (
      (config.get('FILL_POWER_SNAPSHOT_SERVICE_ACTIVE') as string) === 'true'
    ) {
      runFillBlockNumbersOfSnapshotsCronjob();
    }
    if (
      (config.get('FILL_POWER_SNAPSHOT_BALANCE_SERVICE_ACTIVE') as string) ===
      'true'
    ) {
      runFillPowerSnapshotBalanceCronJob();
    }
    if (
      (config.get('UPDATE_POWER_SNAPSHOT_SERVICE_ACTIVE') as string) === 'true'
    ) {
      runUpdatePowerRoundCronJob();
    }
  } catch (err) {
    logger.error(err);
  }
}
