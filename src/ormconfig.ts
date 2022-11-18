import * as dotenv from 'dotenv';
import * as path from 'path';

const configPath = path.resolve(
  __dirname,
  `../config/${process.env.NODE_ENV || ''}.env`,
);
const loadConfigResult = dotenv.config({
  path: configPath,
});

if (loadConfigResult.error) {
  // tslint:disable-next-line:no-console
  console.log('Load process.env error', {
    path: configPath,
    error: loadConfigResult.error,
  });
  throw loadConfigResult.error;
}

import { ConnectionOptions } from 'typeorm';
import { entities } from './entities/entities';
import { logger } from './utils/logger';

const ormConfig: ConnectionOptions = {
  type: 'postgres',
  host: process.env.TYPEORM_DATABASE_HOST,
  port: Number(process.env.TYPEORM_DATABASE_PORT),
  username: process.env.TYPEORM_DATABASE_USER,
  password: process.env.TYPEORM_DATABASE_PASSWORD,
  database: process.env.TYPEORM_DATABASE_NAME,
  entities,
  migrations: ['migration/*.ts'],
  cli: {
    migrationsDir: 'migration',
  },
};

export = ormConfig;
