// @ts-check
import http from 'http';
import path from 'path';
import { Resource } from '@adminjs/typeorm';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from '@apollo/server-plugin-landing-page-graphql-playground';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import bodyParser from 'body-parser';
import { validate } from 'class-validator';
import cors from 'cors';
import express, { json, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.js';
import { RedisStore } from 'rate-limit-redis';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { Container } from 'typedi';
import { DataSource } from 'typeorm';
import config from '../config';
import SentryLogger from '../sentryLogger';
import { handleStripeWebhook } from '../utils/stripe';
import createSchema from './createSchema';

import { runCheckProjectVerificationStatus } from '../services/cronJobs/checkProjectVerificationStatus';
import { runCheckPendingDonationsCronJob } from '../services/cronJobs/syncDonationsWithNetwork';
import { runCheckPendingProjectListingCronJob } from '../services/cronJobs/syncProjectsRequiredForListing';

import { redis } from '../redis';
import { runNotifyMissingDonationsCronJob } from '../services/cronJobs/notifyDonationsWithSegment';
import {
  i18n,
  setI18nLocaleForRequest,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { logger } from '../utils/logger';
import { adminJsRootPath, getAdminJsRouter } from './adminJs/adminJs';
// import { apiGivRouter } from '../routers/apiGivRoutes';
import { AppDataSource, CronDataSource } from '../orm';
import {
  dropDbCronExtension,
  schedulePowerBoostingSnapshot,
  schedulePowerSnapshotsHistory,
} from '../repositories/dbCronRepository';
import {
  oauth2CallbacksRouter,
  SOCIAL_PROFILES_PREFIX,
} from '../routers/oauth2Callbacks';
import { authorizationHandler } from '../services/authorizationServices';
import { runSyncBackupServiceDonations } from '../services/cronJobs/backupDonationImportJob';
import { scheduleCauseDistributionJob } from '../services/cronJobs/causeDistributionJob';
import { runCheckActiveStatusOfQfRounds } from '../services/cronJobs/checkActiveStatusQfRounds';
import { runCheckAndUpdateEndaomentProject } from '../services/cronJobs/checkAndUpdateEndaomentProject';
import { runCheckQRTransactionJob } from '../services/cronJobs/checkQRTransactionJob';
import { runCheckUserSuperTokenBalancesJob } from '../services/cronJobs/checkUserSuperTokenBalancesJob';
import { runDraftDonationMatchWorkerJob } from '../services/cronJobs/draftDonationMatchingJob';
import { runFillPowerSnapshotBalanceCronJob } from '../services/cronJobs/fillSnapshotBalances';
import { runGenerateSitemapOnFrontend } from '../services/cronJobs/generateSitemapOnFrontend';
import { runSyncLostDonations } from '../services/cronJobs/importLostDonationsJob';
import { runInstantBoostingUpdateCronJob } from '../services/cronJobs/instantBoostingUpdateJob';
import { runProjectEvaluationCronJob } from '../services/cronJobs/projectEvaluationService';
import { runCheckPendingRecurringDonationsCronJob } from '../services/cronJobs/syncRecurringDonationsWithNetwork';
import { runCheckPendingSwapsCronJob } from '../services/cronJobs/syncSwapTransactions';
import { runUpdatePowerRoundCronJob } from '../services/cronJobs/updatePowerRoundJob';
import { runUpdateProjectCampaignsCacheJob } from '../services/cronJobs/updateProjectCampaignsCacheJob';
import { runUpdateRecurringDonationStream } from '../services/cronJobs/updateStreamOldRecurringDonationsJob';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { addClient } from '../services/sse/sse';
import { ApolloContext } from '../types/ApolloContext';
import { isTestEnv } from '../utils/utils';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';
import { corsOptions, whitelistHostnames } from './cors';

Resource.validate = validate;

const options = {
  concurrency: Number(
    process.env.PROJECT_FILTERS_THREADS_POOL_CONCURRENCY || 1,
  ),
  name:
    process.env.PROJECT_FILTERS_THREADS_POOL_NAME || 'ProjectFiltersThreadPool',
  size: Number(process.env.PROJECT_FILTERS_THREADS_POOL_SIZE || 4),
};

// Service feature toggles - default to true for backwards compatibility
const isGraphqlEnabled = process.env.ENABLE_GRAPHQL !== 'false';
const isCronjobsEnabled = process.env.ENABLE_CRONJOBS !== 'false';

export async function bootstrap() {
  try {
    logger.debug('bootstrap() has been called', new Date());
    logger.debug('Service configuration:', {
      graphqlEnabled: isGraphqlEnabled,
      cronjobsEnabled: isCronjobsEnabled,
    });

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

    let schema;
    let apolloServer;
    let projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;

    // Only initialize GraphQL components if GraphQL is enabled
    if (isGraphqlEnabled) {
      schema = await createSchema();

      // instantiate pool once and pass as context
      projectsFiltersThreadPool = Pool(
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
      apolloServer = new ApolloServer<ApolloContext>({
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

      logger.debug('bootstrap() before apolloServer.start()', new Date());
      await apolloServer.start();
      logger.debug('bootstrap() after apolloServer.start()', new Date());
    }

    // Express Server
    const app = express();
    const bodyParserJson = bodyParser.json({
      limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '5mb',
    });

    // To download email addresses of projects in AdminJS projects tab
    app.get('/admin/download/:filename', (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(__dirname, '/adminJs/tabs/exports', filename);
      res.download(filePath);
    });

    // Lightweight "hello world" health check for deploy verification.
    // Defined BEFORE global CORS middleware so it's always reachable from any origin.
    app.options('/healthz', cors({ origin: '*', credentials: false }));
    app.get(
      '/healthz',
      cors({ origin: '*', credentials: false }),
      (_req, res) => {
        res.status(200).json({
          ok: true,
          message: 'hello world',
          deployMarker: 'cors-base-giveth-io-allowlist-2026-01-26',
          whitelistHostnames: whitelistHostnames,
          commit:
            process.env.RELEASE ||
            process.env.GIT_SHA ||
            process.env.VERCEL_GIT_COMMIT_SHA ||
            process.env.HEROKU_SLUG_COMMIT ||
            null,
        });
      },
    );

    app.use(setI18nLocaleForRequest); // accept-language header
    if (process.env.DISABLE_SERVER_CORS !== 'true') {
      app.use(cors(corsOptions));
    }

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

    // Only set up GraphQL endpoints if GraphQL is enabled
    if (isGraphqlEnabled && apolloServer) {
      app.use(
        '/graphql',
        json({
          limit: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || '10mb',
        }),
      );
      const graphqlUploadMiddleware = graphqlUploadExpress({
        maxFileSize: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 2000000,
        maxFiles: 10,
      }) as unknown as express.RequestHandler;
      app.use('/graphql', graphqlUploadMiddleware);

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
                  user = await authorizationHandler(
                    authVersion as string,
                    token,
                  );
                }
              }
            } catch (error) {
              SentryLogger.captureException(
                `Error: ${error} for token ${token}`,
              );
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
              expressReq: req, // Include Express request object for IP checking
            };
            return apolloContext;
          },
        }),
      );
    } else {
      logger.info('GraphQL endpoint disabled - ENABLE_GRAPHQL is set to false');
    }

    // AdminJs
    app.use(adminJsRootPath, await getAdminJsRouter());
    app.use(bodyParserJson);
    // app.use('/apigive', apiGivRouter);
    app.use(SOCIAL_PROFILES_PREFIX, oauth2CallbacksRouter);
    app.post(
      '/stripe-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleStripeWebhook,
    );

    // Enhanced health check endpoint
    app.get('/health', async (_req, res) => {
      try {
        const healthStatus = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          whitelistHostnames: whitelistHostnames,
          services: {
            graphql: {
              enabled: isGraphqlEnabled,
              status: isGraphqlEnabled ? 'running' : 'disabled',
            },
            cronjobs: {
              enabled: isCronjobsEnabled,
              status: isCronjobsEnabled ? 'running' : 'disabled',
            },
            database: {
              status: 'connected',
            },
            redis: {
              status: 'connected',
            },
          },
          version: process.env.npm_package_version || 'unknown',
          environment:
            process.env.ENVIRONMENT || process.env.NODE_ENV || 'unknown',
          uptime: process.uptime(),
        };

        // Basic database connectivity check
        try {
          await AppDataSource.getDataSource().query('SELECT 1');
          healthStatus.services.database.status = 'connected';
        } catch (error) {
          healthStatus.services.database.status = 'disconnected';
          healthStatus.status = 'degraded';
        }

        // Basic Redis connectivity check
        try {
          await redis.ping();
          healthStatus.services.redis.status = 'connected';
        } catch (error) {
          healthStatus.services.redis.status = 'disconnected';
          healthStatus.status = 'degraded';
        }

        const statusCode = healthStatus.status === 'ok' ? 200 : 503;
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Route to handle SSE connections
    app.get('/events', (_req: Request, res: Response) => {
      addClient(res);
    });

    const httpServer = http.createServer(app);

    await new Promise<void>((resolve, reject) => {
      httpServer
        .listen({ port: 4000 }, () => {
          logger.debug(`🚀 Server is running on port 4000`);
          if (isGraphqlEnabled) {
            logger.debug(
              `📊 GraphQL Playground available at http://127.0.0.1:4000/graphql`,
            );
          }
          logger.debug(
            `🩺 Health check available at http://127.0.0.1:4000/health`,
          );
          performPostStartTasks();
          resolve(); // Resolve the Promise once the server is successfully listening
        })
        .on('error', err => {
          logger.debug(`Starting server failed`, err);
          reject(err); // Reject the Promise if there's an error starting the server
        });
    });
  } catch (err) {
    logger.fatal('bootstrap() error', err);
  }

  async function continueDbSetup() {
    logger.debug('continueDbSetup() has been called', new Date());

    const enableDbCronJob =
      config.get('ENABLE_DB_POWER_BOOSTING_SNAPSHOT') === 'true';
    if (enableDbCronJob && isCronjobsEnabled) {
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
    runProjectEvaluationCronJob();
    runCheckPendingRecurringDonationsCronJob();
    runNotifyMissingDonationsCronJob();
    runCheckPendingProjectListingCronJob();
    runCheckAndUpdateEndaomentProject();

    runCheckPendingSwapsCronJob();

    // if (process.env.ENABLE_CLUSTER_MATCHING === 'true') {
    //   runSyncEstimatedClusterMatchingCronjob();
    // }

    if (process.env.PROJECT_REVOKE_SERVICE_ACTIVE === 'true') {
      runCheckProjectVerificationStatus();
    }

    // if (process.env.SITEMAP_CRON_SECRET !== '') {
    //   runGenerateSitemapOnFrontend();
    // }

    if (process.env.GENERATE_SITEMAP_CRONJOB_EXPRESSION !== '') {
      runGenerateSitemapOnFrontend();
    }

    // If we need to deactivate the process use the env var NO MORE
    // if (process.env.GIVING_BLOCKS_SERVICE_ACTIVE === 'true') {
    //   runGivingBlocksProjectSynchronization();
    // }

    if (process.env.ENABLE_IMPORT_LOST_DONATIONS === 'true') {
      runSyncLostDonations();
    }

    if (process.env.ENABLE_IMPORT_DONATION_BACKUP === 'true') {
      runSyncBackupServiceDonations();
    }

    if (process.env.ENABLE_DRAFT_DONATION === 'true') {
      runDraftDonationMatchWorkerJob();
    }

    if (process.env.ENABLE_DRAFT_RECURRING_DONATION === 'true') {
      // TODO now disabling this field would break the recurring donation feature so I commented because otherwise draftDonation worker pool woud not work
      // runDraftRecurringDonationMatchWorkerJob();
    }

    if (process.env.FILL_POWER_SNAPSHOT_BALANCE_SERVICE_ACTIVE === 'true') {
      runFillPowerSnapshotBalanceCronJob();
    }
    logger.debug('Running givPower cron jobs info ', {
      UPDATE_POWER_SNAPSHOT_SERVICE_ACTIVE: config.get(
        'UPDATE_POWER_SNAPSHOT_SERVICE_ACTIVE',
      ),
      ENABLE_INSTANT_BOOSTING_UPDATE: config.get(
        'ENABLE_INSTANT_BOOSTING_UPDATE',
      ),
      INSTANT_BOOSTING_UPDATE_CRONJOB_EXPRESSION: config.get(
        'INSTANT_BOOSTING_UPDATE_CRONJOB_EXPRESSION',
      ),
      UPDATE_POWER_ROUND_CRONJOB_EXPRESSION: config.get(
        'UPDATE_POWER_ROUND_CRONJOB_EXPRESSION',
      ),
    });
    if (process.env.UPDATE_POWER_SNAPSHOT_SERVICE_ACTIVE === 'true') {
      runUpdatePowerRoundCronJob();
    }
    if (process.env.ENABLE_INSTANT_BOOSTING_UPDATE === 'true') {
      runInstantBoostingUpdateCronJob();
    }
    if (process.env.ENABLE_UPDATE_RECURRING_DONATION_STREAM === 'true') {
      runUpdateRecurringDonationStream();
      runCheckUserSuperTokenBalancesJob();
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

    runCheckQRTransactionJob();

    // Schedule cause distribution job
    scheduleCauseDistributionJob();
  }

  async function performPostStartTasks() {
    // All heavy and non-critical initializations here
    try {
      await continueDbSetup();
    } catch (e) {
      logger.fatal('continueDbSetup() error', e);
    }
    if (isCronjobsEnabled) {
      await initializeCronJobs();
    }
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
