// @ts-check
import config from '../config';
import RateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import express, { json, Request, Response } from 'express';
import { handleStripeWebhook } from '../utils/stripe';
import createSchema from './createSchema';
import { getResolvers } from '../resolvers/resolvers';
import { Container } from 'typedi';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { ConfirmUserResolver } from '../user/ConfirmUserResolver';
import { Resource } from '@adminjs/typeorm';
import { validate } from 'class-validator';
import SentryLogger from '../sentryLogger';

import { runCheckPendingDonationsCronJob } from '../services/cronJobs/syncDonationsWithNetwork';
import { runCheckPendingProjectListingCronJob } from '../services/cronJobs/syncProjectsRequiredForListing';
import { runCheckProjectVerificationStatus } from '../services/cronJobs/checkProjectVerificationStatus';
import { webhookHandler } from '../services/transak/webhookHandler';

import {
  adminJsQueryCache,
  adminJsRootPath,
  getAdminJsRouter,
} from './adminJs/adminJs';
import { redis } from '../redis';
import { logger } from '../utils/logger';
import { runNotifyMissingDonationsCronJob } from '../services/cronJobs/notifyDonationsWithSegment';
import {
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
import {
  dropDbCronExtension,
  schedulePowerBoostingSnapshot,
  schedulePowerSnapshotsHistory,
} from '../repositories/dbCronRepository';
import { runFillBlockNumbersOfSnapshotsCronjob } from '../services/cronJobs/fillBlockNumberOfPoweSnapShots';
import { runFillPowerSnapshotBalanceCronJob } from '../services/cronJobs/fillSnapshotBalances';
import { runUpdatePowerRoundCronJob } from '../services/cronJobs/updatePowerRoundJob';
import { onramperWebhookHandler } from '../services/onramper/webhookHandler';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { DataSource } from 'typeorm';
import { AppDataSource, CronDataSource } from '../orm';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloContext } from '../types/ApolloContext';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';

import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { runInstantBoostingUpdateCronJob } from '../services/cronJobs/instantBoostingUpdateJob';

Resource.validate = validate;

const options = {
  concurrency: Number(
    process.env.PROJECT_FILTERS_THREADS_POOL_CONCURRENCY || 1,
  ),
  name:
    process.env.PROJECT_FILTERS_THREADS_POOL_NAME || 'ProjectFiltersThreadPool',
  size: Number(process.env.PROJECT_FILTERS_THREADS_POOL_SIZE || 4),
};

export async function bootstrap() {
  try {
    await AppDataSource.initialize();
    await CronDataSource.initialize();
    Container.set(DataSource, AppDataSource.getDataSource());
    const resolvers = getResolvers();

    if (config.get('REGISTER_USERNAME_PASSWORD') === 'true') {
      resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver]);
    }

    // Actually we should use await AppDataSource.initialize(); but it throw errors I think because some changes
    // are needed in using typeorm repositories, so currently I kept this

    const dropSchema = config.get('DROP_DATABASE') === 'true';
    if (dropSchema) {
      // tslint:disable-next-line:no-console
      console.log('Drop database....');
      await AppDataSource.getDataSource().synchronize(dropSchema);
      // tslint:disable-next-line:no-console
      console.log('Drop done.');
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
        const powerSnapshotsHistoricScheduleExpression = config.get(
          'ARCHIVE_POWER_BOOSTING_OLD_SNAPSHOT_DATA_CRONJOB_EXPRESSION',
        ) as string;
        await schedulePowerBoostingSnapshot(scheduleExpression);
        await schedulePowerSnapshotsHistory(
          powerSnapshotsHistoricScheduleExpression,
        );
      } catch (e) {
        logger.error('Enabling power boosting snapshot ', e);
      }
    }

    // instantiate pool once and pass as context
    const projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>> =
      Pool(
        () => spawn(new Worker('../workers/projectsResolverWorker')),
        options,
      );

    const apolloServerPlugins = [
      process.env.DISABLE_APOLLO_PLAYGROUND !== 'true'
        ? ApolloServerPluginLandingPageGraphQLPlayground({
            endpoint: '/graphql',
          })
        : ApolloServerPluginLandingPageDisabled(),
    ];

    if (process.env.APOLLO_GRAPH_REF) {
      apolloServerPlugins.push(ApolloServerPluginSchemaReporting());
    }

    // Create GraphQL server
    const apolloServer = new ApolloServer<ApolloContext>({
      schema,
      csrfPrevention: false, // TODO: Prevent CSRF attack
      formatError: (formattedError, _err) => {
        const err = _err as Error;
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
        // Return a different error message
        if (
          formattedError?.extensions?.code ===
          ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED
        ) {
          return {
            ...formattedError,
            message: `Your query doesn't match the schema. Try double-checking it!`,
          };
        }

        // Otherwise return the formatted error. This error can also
        // be manipulated in other ways, as long as it's returned.
        return formattedError;
      },
      plugins: apolloServerPlugins,
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
    const bodyParserJson = bodyParser.json({
      limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '5mb',
    });

    app.use(setI18nLocaleForRequest); // accept-language header
    app.use(cors(corsOptions));
    app.use(bodyParserJson);
    const limiter = new RateLimit({
      store: new RedisStore({
        prefix: 'rate-limit:',
        client: redis,
        // see Configuration
      }),
      windowMs: 60 * 1000, // 1 minutes
      max: Number(process.env.ALLOWED_REQUESTS_PER_MINUTE), // limit each IP to 40 requests per windowMs
      skip: (req: Request, res: Response) => {
        const vercelKey = process.env.VERCEL_KEY;
        if (vercelKey && req.headers.vercel_key === vercelKey) {
          // Skip rate-limit for Vercel requests because our front is SSR
          return true;
        }
        if (req.url.startsWith('/admin')) {
          // Bypass AdminJS panel request
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

    await apolloServer.start();
    app.use(
      '/graphql',
      expressMiddleware<ApolloContext>(apolloServer, {
        context: async ({ req }) => {
          let token: string = '';
          let user;
          let auth;
          try {
            if (req) {
              const { headers } = req;
              const authVersion = headers.authversion || '1';
              if (headers.authorization) {
                token = headers.authorization.split(' ')[1].toString();
                user = await authorizationHandler(authVersion as string, token);
              }
            }
          } catch (error) {
            SentryLogger.captureException(`Error: ${error} for token ${token}`);
            logger.error(
              `Error: ${error} for token ${token} authVersion ${
                req?.headers?.authversion || '1'
              }`,
            );
            auth = {
              token,
              error,
            };
          }

          const apolloContext: ApolloContext = {
            projectsFiltersThreadPool,
            req: { user, auth },
          };
          return apolloContext;
        },
      }),
    );
    app.use('/apigive', apiGivRouter);
    app.use(SOCIAL_PROFILES_PREFIX, oauth2CallbacksRouter);
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

    const httpServer = http.createServer(app);

    // Start the server
    // app.listen({ port: 4000 });
    await new Promise<void>(resolve =>
      httpServer.listen({ port: 4000 }, resolve),
    );

    logger.debug(
      `🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`,
    );

    // Admin Bruh!
    app.use(adminJsQueryCache);
    app.use(adminJsRootPath, await getAdminJsRouter());

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
    if ((config.get('ENABLE_INSTANT_BOOSTING_UPDATE') as string) === 'true') {
      runInstantBoostingUpdateCronJob();
    }
  } catch (err) {
    logger.error(err);
  }
}
