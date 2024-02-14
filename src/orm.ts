import { DataSource } from 'typeorm';
import config from './config';
import { CronJob } from './entities/CronJob';
import { getEntities } from './entities/entities';
import { redis, redisConfig } from './redis';

export class AppDataSource {
  private static datasource: DataSource;

  static async initialize(_overrideDrop?: boolean) {
    if (!AppDataSource.datasource) {
      const dropSchema =
        _overrideDrop ?? config.get('DROP_DATABASE') === 'true';
      const synchronize = (config.get('ENVIRONMENT') as string) === 'test';
      const entities = getEntities();
      AppDataSource.datasource = new DataSource({
        schema: 'public',
        type: 'postgres',
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
        port: config.get('TYPEORM_DATABASE_PORT') as number,
        host: config.get('TYPEORM_DATABASE_HOST') as string,
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
      });
      await CronDataSource.datasource.initialize();
    }
  }

  static getDataSource() {
    return CronDataSource.datasource;
  }
}
