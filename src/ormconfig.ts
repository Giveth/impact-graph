import * as dotenv from 'dotenv';
import * as path from 'path';

import { DataSource } from 'typeorm';
import { entities } from './entities/entities';
import config from './config';
dotenv.config({
  path: path.resolve(__dirname, `./config/${process.env.NODE_ENV || ''}.env`),
});

const dropSchema = config.get('DROP_DATABASE') === 'true';
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TYPEORM_DATABASE_HOST,
  port: Number(process.env.TYPEORM_DATABASE_PORT),
  username: process.env.TYPEORM_DATABASE_USER,
  password: process.env.TYPEORM_DATABASE_PASSWORD,
  database: process.env.TYPEORM_DATABASE_NAME,
  dropSchema,
  entities,
  synchronize: true,
  migrations: ['./migration/*.ts'],
});
