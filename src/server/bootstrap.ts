// @ts-check
import path from 'path';
import http from 'http';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import express, { json, Request } from 'express';
import { Container } from 'typedi';
import { Resource } from '@adminjs/typeorm';
import { validate } from 'class-validator';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { DataSource } from 'typeorm';
import cors from 'cors';
import bodyParser from 'body-parser';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import config from '../config';
import { handleStripeWebhook } from '../utils/stripe';
import createSchema from './createSchema';
import SentryLogger from '../sentryLogger';

import { runCheckPendingDonationsCronJob } from '../services/cronJobs/syncDonationsWithNetwork';
import { webhookHandler } from '../services/transak/webhookHandler';

import { adminJsRootPath, getAdminJsRouter } from './adminJs/adminJs';
import { redis } from '../redis';
import { logger } from '../utils/logger';
import { runNotifyMissingDonationsCronJob } from '../services/cronJobs/notifyDonationsWithSegment';
import {
  i18n,
  setI18nLocaleForRequest,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { apiGivRouter } from '../routers/apiGivRoutes';
import { authorizationHandler } from '../services/authorizationServices';
import {
  oauth2CallbacksRouter,
  SOCIAL_PROFILES_PREFIX,
} from '../routers/oauth2Callbacks';
import { dropDbCronExtension } from '../repositories/dbCronRepository';
import { AppDataSource, CronDataSource } from '../orm';
import { ApolloContext } from '../types/ApolloContext';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';

import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { isTestEnv } from '../utils/utils';
import { runCheckActiveStatusOfQfRounds } from '../services/cronJobs/checkActiveStatusQfRounds';
import { runUpdateProjectCampaignsCacheJob } from '../services/cronJobs/updateProjectCampaignsCacheJob';
import { corsOptions, setCorsHeaders } from './cors';
import { runSyncLostDonations } from '../services/cronJobs/importLostDonationsJob';
// import { runSyncBackupServiceDonations } from '../services/cronJobs/backupDonationImportJob';
import { runDraftDonationMatchWorkerJob } from '../services/cronJobs/draftDonationMatchingJob';
import {
  QACC_DONATION_TOKEN_ADDRESS,
  QACC_DONATION_TOKEN_COINGECKO_ID,
  QACC_DONATION_TOKEN_DECIMALS,
  QACC_DONATION_TOKEN_NAME,
  QACC_DONATION_TOKEN_SYMBOL,
} from '../utils/qacc';
import { QACC_NETWORK_ID } from '../provider';
import { Token } from '../entities/token';
import { ChainType } from '../types/network';

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
    logger.debug('bootstrap() has been called', new Date());

    logger.debug('bootstrap() before AppDataSource.initialize()', new Date());
    await AppDataSource.initialize();
    logger.debug('bootstrap() after AppDataSource.initialize()', new Date());

    logger.debug('bootstrap() before CronDataSource.initialize()', new Date());
    await CronDataSource.initialize();
    logger.debug('bootstrap() after CronDataSource.initialize()', new Date());

    Container.set(DataSource, AppDataSource.getDataSource());

    await setDatabaseParameters(AppDataSource.getDataSource());

    const dropSchema = config.get('DROP_DATABASE') === 'true';
    if (dropSchema) {
      // eslint-disable-next-line no-console
      console.log('Drop database....');
      await AppDataSource.getDataSource().synchronize(dropSchema);
      // eslint-disable-next-line no-console
      console.log('Drop done.');
      try {
        await dropDbCronExtension();
      } catch (e) {
        logger.error('drop pg_cron extension error', e);
      }
    }

    const schema = await createSchema();

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
    const bodyParserJson = bodyParser.json({
      limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '5mb',
    });

    app.use(cors());

    // To download email addresses of projects in AdminJS projects tab
    app.get('/admin/download/:filename', (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, '/adminJs/tabs/exports', filename);
      res.download(filePath);
    });

    app.use(setI18nLocaleForRequest); // accept-language header
    if (process.env.DISABLE_SERVER_CORS !== 'true') {
      app.use(cors(corsOptions));
      app.use(setCorsHeaders);
    }
    app.use(bodyParserJson);

    if (process.env.DISABLE_SERVER_RATE_LIMITER !== 'true') {
      const limiter = rateLimit({
        store: new RedisStore({
          prefix: 'rate-limit:',
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: (...args: string[]) => redis.call(...args), // see Configuration
        }),
        windowMs: 60 * 1000, // 1 minutes
        max: Number(process.env.ALLOWED_REQUESTS_PER_MINUTE), // limit each IP to 40 requests per windowMs
        skip: (req: Request) => {
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
    }

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

    logger.debug('bootstrap() before apolloServer.start()', new Date());
    await apolloServer.start();
    logger.debug('bootstrap() after apolloServer.start()', new Date());

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
    app.get('/health', (_req, res) => {
      res.send('Hi every thing seems ok');
    });
    app.post('/transak_webhook', webhookHandler);

    const httpServer = http.createServer(app);

    await new Promise<void>((resolve, reject) => {
      httpServer
        .listen({ port: 4000 }, () => {
          logger.debug(
            `🚀 Server is running, GraphQL Playground available at http://127.0.0.1:${4000}/graphql`,
          );
          performPostStartTasks();
          resolve(); // Resolve the Promise once the server is successfully listening
        })
        .on('error', err => {
          logger.debug(`Starting server failed`, err);
          reject(err); // Reject the Promise if there's an error starting the server
        });
    });

    // AdminJs!
    app.use(adminJsRootPath, await getAdminJsRouter());
  } catch (err) {
    logger.fatal('bootstrap() error', err);
  }

  async function continueDbSetup() {
    logger.debug('continueDbSetup() has been called', new Date());
    if (!isTestEnv) {
      // They will fail in test env, because we run migrations after bootstrap so refreshing them will cause this error
      // relation "project_estimated_matching_view" does not exist
      logger.debug(
        'continueDbSetup() before refreshProjectEstimatedMatchingView() ',
        new Date(),
      );
      await refreshProjectEstimatedMatchingView();
      logger.debug(
        'continueDbSetup() after refreshProjectEstimatedMatchingView() ',
        new Date(),
      );
    }
    logger.debug('continueDbSetup() end of function', new Date());
  }

  async function initializeCronJobs() {
    logger.debug('initializeCronJobs() has been called', new Date());
    runCheckPendingDonationsCronJob();
    runNotifyMissingDonationsCronJob();

    if (process.env.ENABLE_IMPORT_LOST_DONATIONS === 'true') {
      runSyncLostDonations();
    }

    // if (process.env.ENABLE_IMPORT_DONATION_BACKUP === 'true') {
    //   runSyncBackupServiceDonations();
    // }

    if (process.env.ENABLE_DRAFT_DONATION === 'true') {
      runDraftDonationMatchWorkerJob();
    }

    logger.debug(
      'initializeCronJobs() before runCheckActiveStatusOfQfRounds() ',
      new Date(),
    );
    await runCheckActiveStatusOfQfRounds();
    logger.debug(
      'initializeCronJobs() after runCheckActiveStatusOfQfRounds() ',
      new Date(),
    );

    logger.debug(
      'initializeCronJobs() before runUpdateProjectCampaignsCacheJob() ',
      new Date(),
    );
    await runUpdateProjectCampaignsCacheJob();
    logger.debug(
      'initializeCronJobs() after runUpdateProjectCampaignsCacheJob() ',
      new Date(),
    );
  }

  async function addQAccToken() {
    if (
      QACC_DONATION_TOKEN_NAME &&
      QACC_DONATION_TOKEN_ADDRESS &&
      QACC_DONATION_TOKEN_SYMBOL &&
      QACC_DONATION_TOKEN_DECIMALS &&
      QACC_DONATION_TOKEN_COINGECKO_ID &&
      QACC_NETWORK_ID
    ) {
      // instert into token
      Token.createQueryBuilder()
        .insert()
        .values({
          name: QACC_DONATION_TOKEN_NAME,
          address: QACC_DONATION_TOKEN_ADDRESS.toLocaleLowerCase(),
          symbol: QACC_DONATION_TOKEN_SYMBOL,
          decimals: QACC_DONATION_TOKEN_DECIMALS,
          networkId: QACC_NETWORK_ID,
          chainType: ChainType.EVM,
          coingeckoId: QACC_DONATION_TOKEN_COINGECKO_ID,
        })
        .orIgnore()
        .execute();
    }
  }

  async function performPostStartTasks() {
    // All heavy and non-critical initializations here
    try {
      await continueDbSetup();
    } catch (e) {
      logger.fatal('continueDbSetup() error', e);
    }
    await initializeCronJobs();
    await addQAccToken();
  }
}

async function setDatabaseParameters(ds: DataSource) {
  await setPgTrgmParameters(ds);
}

async function setPgTrgmParameters(ds: DataSource) {
  const similarityThreshold =
    Number(config.get('PROJECT_SEARCH_SIMILARITY_THRESHOLD')) || 0.1;
  await ds.query(`SET pg_trgm.similarity_threshold TO ${similarityThreshold};`);
  await ds.query(
    `SET pg_trgm.word_similarity_threshold TO ${similarityThreshold};`,
  );
}
