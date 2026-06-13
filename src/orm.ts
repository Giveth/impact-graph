import { DataSource } from 'typeorm';
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';
import config from './config';
import { CronJob } from './entities/CronJob';
import { getEntities } from './entities/entities';
import { redisConfig } from './redis';
import { logger } from './utils/logger';

// Shared connection-pool tuning for DataSources that run behind a Postgres
// connection pooler (DigitalOcean managed Postgres / PgBouncer).
const poolerExtraConfig = {
  // Recycling idle connections every 500ms (the previous idleTimeoutMillis)
  // caused constant reconnect + login churn against the pooler, surfacing in
  // production as "server login has been failing ... (server_login_retry)" errors.
  idleTimeoutMillis: 30000,
  // Fail fast instead of hanging forever when a connection cannot be acquired
  // during a pooler stall, so requests error out quickly and the pool can recover.
  connectionTimeoutMillis: 10000,
  // (maxWaitingClients / evictionRunIntervalMillis were generic-pool options
  // that node-postgres ignores, so they were removed.)
};

export class AppDataSource {
  private static datasource: DataSource;

  static async initialize(_overrideDrop?: boolean) {
    if (!AppDataSource.datasource) {
      const dropSchema =
        _overrideDrop ?? config.get('DROP_DATABASE') === 'true';
      const synchronize = (config.get('ENVIRONMENT') as string) === 'test';
      const entities = getEntities();
      const poolSize = Number(process.env.TYPEORM_DATABASE_POOL_SIZE) || 10; // 10 is the default value
      const slaves: PostgresConnectionCredentialsOptions[] = [];
      if (config.get('TYPEORM_DATABASE_HOST_READONLY')) {
        slaves.push({
          database: config.get('TYPEORM_DATABASE_NAME_READONLY') as string,
          username: config.get('TYPEORM_DATABASE_USER_READONLY') as string,
          password: config.get('TYPEORM_DATABASE_PASSWORD_READONLY') as string,
          port: config.get('TYPEORM_DATABASE_PORT_READONLY') as number,
          host: config.get('TYPEORM_DATABASE_HOST_READONLY') as string,
        });
      }
      AppDataSource.datasource = new DataSource({
        schema: 'public',
        type: 'postgres',
        replication: {
          defaultMode: slaves.length > 0 ? 'slave' : 'master',
          master: {
            database: config.get('TYPEORM_DATABASE_NAME') as string,
            username: config.get('TYPEORM_DATABASE_USER') as string,
            password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
            port: config.get('TYPEORM_DATABASE_PORT') as number,
            host: config.get('TYPEORM_DATABASE_HOST') as string,
          },
          slaves,
        },
        entities,
        synchronize,
        dropSchema,
        logger: 'advanced-console',
        logging: ['error'],
        cache: {
          type: 'redis',
          options: {
            ...redisConfig,
            db: 1, // Query Caching
          },
        },
        poolSize,
        extra: poolerExtraConfig,
      });
      await AppDataSource.datasource.initialize();

      // Log replication configuration
      if (slaves.length > 0) {
        logger.info(
          `✅ AppDataSource initialized with ${slaves.length} read replica(s)`,
        );
        logger.info(`   Master: ${config.get('TYPEORM_DATABASE_HOST')}`);
        slaves.forEach((slave, idx) => {
          logger.info(`   Replica ${idx + 1}: ${slave.host}`);
        });
      } else {
        logger.info('✅ AppDataSource initialized (No replicas configured)');
      }
    }
  }

  static getDataSource() {
    return AppDataSource.datasource;
  }
}

export class CronDataSource {
  private static datasource: DataSource;
  static async initialize() {
    if (!this.datasource) {
      CronDataSource.datasource = new DataSource({
        type: 'postgres',
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
        port: config.get('TYPEORM_DATABASE_PORT') as number,
        host: config.get('TYPEORM_DATABASE_HOST') as string,
        entities: [CronJob],
        synchronize: false,
        dropSchema: false,
        extra: poolerExtraConfig,
      });
      await CronDataSource.datasource.initialize();
    }
  }

  static getDataSource() {
    return CronDataSource.datasource;
  }
}
