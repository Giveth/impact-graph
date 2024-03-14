import * as path from 'path';
import * as dotenv from 'dotenv';

import { DataSourceOptions } from 'typeorm';
import { getEntities } from './entities/entities';
dotenv.config({
  path: path.resolve(__dirname, `./config/${process.env.NODE_ENV || ''}.env`),
});

const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.TYPEORM_DATABASE_HOST,
  port: Number(process.env.TYPEORM_DATABASE_PORT),
  username: process.env.TYPEORM_DATABASE_USER,
  password: process.env.TYPEORM_DATABASE_PASSWORD,
  database: process.env.TYPEORM_DATABASE_NAME,
  entities: getEntities(),
  migrations: ['migration/1646303882607-seedTokes.ts'],
  // cli: {
  //   migrationsDir: 'migration',
  // },
};

export = ormConfig;
