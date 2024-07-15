import * as path from 'path';
import { PostgresConnectionCredentialsOptions } from 'typeorm/driver/postgres/PostgresConnectionCredentialsOptions';

import * as dotenv from 'dotenv';
const configPath = path.resolve(
  __dirname,
  `../config/${process.env.NODE_ENV || ''}.env`,
);

const loadConfigResult = dotenv.config({
  path: configPath,
});

if (loadConfigResult.error) {
  // eslint-disable-next-line no-console
  console.log('Load process.env error', {
    path: configPath,
    error: loadConfigResult.error,
  });
  throw loadConfigResult.error;
}
import { DataSource, DataSourceOptions } from 'typeorm';
import { getEntities } from './entities/entities';
import { ENVIRONMENTS } from './utils/utils';
import config from './config';
import { redisConfig } from './redis';

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

const ormConfig: DataSourceOptions = {
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
  synchronize: false,
  dropSchema: false,
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
  extra: {
    maxWaitingClients: 10,
    evictionRunIntervalMillis: 500,
    idleTimeoutMillis: 500,
    migrations:
      process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
        ? ['migration/*.js']
        : ['migration/*.ts'],
  },
};

export const AppDataSource = new DataSource(ormConfig);

exports = ormConfig;
