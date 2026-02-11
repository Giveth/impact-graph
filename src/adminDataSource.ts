import { DataSource } from 'typeorm';
import config from './config';
import { getEntities } from './entities/entities';
import { redisConfig } from './redis';
import { logger } from './utils/logger';

/**
 * AdminDataSource - Dedicated DataSource for AdminJS
 *
 * This DataSource ALWAYS uses the master database for both reads and writes.
 * This ensures AdminJS operations work correctly without trying to write to read replicas.
 *
 * IMPORTANT: Do NOT change defaultMode to 'slave' for this DataSource
 */
export class AdminDataSource {
  private static datasource: DataSource;

  static async initialize() {
    if (!AdminDataSource.datasource) {
      const entities = getEntities();
      const poolSize = Number(process.env.TYPEORM_DATABASE_POOL_SIZE) || 10;

      // AdminJS always uses master - no read replica routing
      AdminDataSource.datasource = new DataSource({
        name: 'admin', // Unique name for AdminJS DataSource
        schema: 'public',
        type: 'postgres',
        // Single master connection - no replication for AdminJS
        host: config.get('TYPEORM_DATABASE_HOST') as string,
        port: config.get('TYPEORM_DATABASE_PORT') as number,
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,

        entities,
        synchronize: false, // Never auto-sync in admin
        dropSchema: false,
        logger: 'advanced-console',
        logging: ['error', 'warn'],
        cache: {
          type: 'redis',
          options: {
            ...redisConfig,
            db: 2, // Different Redis DB for admin cache
          },
        },
        poolSize: Math.max(5, Math.floor(poolSize / 2)), // Smaller pool for admin
        extra: {
          maxWaitingClients: 5,
          evictionRunIntervalMillis: 1000,
          idleTimeoutMillis: 1000,
        },
      });

      await AdminDataSource.datasource.initialize();
      logger.info('✅ AdminDataSource initialized (Master only)');
    }
  }

  static getDataSource() {
    if (!AdminDataSource.datasource) {
      throw new Error(
        'AdminDataSource not initialized. Call initialize() first.',
      );
    }
    return AdminDataSource.datasource;
  }

  static async close() {
    if (AdminDataSource.datasource?.isInitialized) {
      await AdminDataSource.datasource.destroy();
      logger.info('AdminDataSource closed');
    }
  }
}
