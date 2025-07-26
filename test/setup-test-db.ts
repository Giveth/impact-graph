import { bootstrap } from '../src/server/bootstrap';
import { AppDataSource } from '../src/orm';
import { logger } from '../src/utils/logger';
import { redis } from '../src/redis';
import { seedDb, runMigrations, ensureDatabaseReady } from './pre-test-scripts';

/**
 * This script initializes the test database once before running all tests.
 * It creates a database snapshot that can be quickly restored for each test file,
 * significantly reducing test execution time.
 */
async function setupTestDatabase() {
  try {
    logger.debug('Test database setup starting', new Date());
    logger.debug('Clear Redis: ', await redis.flushall());

    // Initialize the application and database
    logger.debug('Bootstrapping application...', new Date());
    await bootstrap();
    logger.debug('Bootstrap completed', new Date());

    // Ensure DataSource is set for all entities
    const dataSource = AppDataSource.getDataSource();
    if (dataSource && dataSource.isInitialized) {
      logger.debug('Setting DataSource for all entities after bootstrap');

      // Fix discriminator metadata issue with TableInheritance
      dataSource.entityMetadatas.forEach(metadata => {
        if (metadata.name === 'Project') {
          metadata.discriminatorValue = 'project';
        }
        if (metadata.name === 'Cause') {
          metadata.discriminatorValue = 'cause';
        }
      });
    }

    // Verify database connection is ready
    logger.debug('Verifying database connection...', new Date());
    await ensureDatabaseReady();

    // Seed the database and run migrations
    logger.debug('Seeding database...', new Date());
    await seedDb();
    logger.debug('Running migrations...', new Date());
    await runMigrations();

    // Create snapshot schema for later use
    await createDatabaseSnapshot();

    logger.debug('Test database setup completed successfully', new Date());
    process.exit(0);
  } catch (e) {
    logger.error('Test database setup failed', e);
    process.exit(1);
  }
}

/**
 * Creates a database snapshot that can be restored quickly
 * This significantly speeds up tests by avoiding full database recreation
 */
async function createDatabaseSnapshot() {
  const dataSource = AppDataSource.getDataSource();
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('Cannot create snapshot: DataSource not initialized');
  }

  logger.debug('Creating database snapshot...', new Date());

  try {
    // Create a snapshot of the current database state
    await dataSource.query(`SELECT pg_advisory_lock(1)`);
    await dataSource.query(`DROP SCHEMA IF EXISTS snapshot CASCADE`);
    await dataSource.query(`CREATE SCHEMA snapshot`);

    // Get all tables from public schema
    const tables = await dataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );

    // Copy each table structure and data to snapshot schema
    for (const { tablename } of tables) {
      await dataSource.query(
        `CREATE TABLE snapshot.${tablename} AS SELECT * FROM public.${tablename}`,
      );
    }

    await dataSource.query(`SELECT pg_advisory_unlock(1)`);
    logger.debug('Database snapshot created successfully', new Date());
  } catch (error) {
    logger.error('Failed to create database snapshot', error);
    throw error;
  }
}

// Run the setup
setupTestDatabase();
