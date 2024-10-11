import { DataSource } from 'typeorm';
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';
import config from './config';
import { CronJob } from './entities/CronJob';
import { getEntities } from './entities/entities';
import { redisConfig } from './redis';

export class AppDataSource {
  private static datasource: DataSource;

  static async initialize(_overrideDrop?: boolean) {
    if (!AppDataSource.datasource) {
      const isTestEnv = (config.get('ENVIRONMENT') as string) === 'test';
      const dropSchema =
        _overrideDrop ?? config.get('DROP_DATABASE') === 'true';
      const synchronize = isTestEnv;
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
          defaultMode: 'master',
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
        // ssl: config.get('TYPEORM_DISABLE_SSL') === 'true' ? false : undefined, // use default in case it's not set
        cache: isTestEnv
          ? false
          : {
              type: 'redis',
              options: {
                ...redisConfig,
                db: 1, // Query Caching
              },
            },
        poolSize,
        extra: {
          maxWaitingClients: 10,
          evictionRunIntervalMillis: 500,
          idleTimeoutMillis: 500,
        },
      });
      await AppDataSource.datasource.initialize();
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
        extra: {
          maxWaitingClients: 10,
          evictionRunIntervalMillis: 500,
          idleTimeoutMillis: 500,
        },
      });
      await CronDataSource.datasource.initialize();
    }
  }

  static getDataSource() {
    return CronDataSource.datasource;
  }
}
