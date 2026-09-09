import {
  EntityTarget,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { AdminDataSource } from '../adminDataSource';
import { AppDataSource } from '../orm';

/**
 * Database Routing Helpers
 *
 * These utilities help control whether queries go to master or read replicas.
 *
 * IMPORTANT CONCEPTS:
 * - With replication.defaultMode: 'slave', SELECT queries automatically go to replicas
 * - INSERT, UPDATE, DELETE always go to master regardless of defaultMode
 * - Transactions always use master connection
 *
 * USE CASES FOR FORCING MASTER:
 * 1. Read-after-write scenarios (need immediate consistency)
 * 2. Critical reads that need absolute latest data
 * 3. Authentication/Authorization checks
 * 4. Financial operations that need strong consistency
 */

/**
 * Execute a SELECT query on the master database with proper connection cleanup
 * Use this for critical reads that need absolute consistency (read-after-write scenarios)
 *
 * @example
 * const user = await queryMaster(
 *   User.createQueryBuilder('user').where('user.id = :id', { id: userId })
 * );
 *
 * @example
 * const users = await queryMaster(
 *   User.createQueryBuilder('user').where('user.isActive = true'),
 *   'getMany'
 * );
 */
export async function queryMaster<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  method:
    | 'getOne'
    | 'getMany'
    | 'getRawOne'
    | 'getRawMany'
    | 'getCount' = 'getOne',
): Promise<any> {
  const dataSource = AppDataSource.getDataSource();
  const queryRunner = dataSource.createQueryRunner('master');

  try {
    await queryRunner.connect();
    const result = await queryBuilder.setQueryRunner(queryRunner)[method]();
    return result;
  } finally {
    // CRITICAL: Always release the query runner to return connection to pool
    await queryRunner.release();
  }
}

/**
 * Get a repository that always uses master connection
 * Useful for AdminJS or critical write operations
 *
 * @example
 * const userRepo = getMasterRepository(User);
 * const user = await userRepo.findOne({ where: { id: userId } });
 */
export function getMasterRepository<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Repository<T> {
  // AdminDataSource always uses master
  return AdminDataSource.getDataSource().getRepository(entity);
}

/**
 * Get a repository using the standard AppDataSource
 * With defaultMode: 'slave', SELECTs will use replicas
 *
 * @example
 * const projectRepo = getRepository(Project);
 * const projects = await projectRepo.find(); // Uses replica
 */
export function getRepository<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Repository<T> {
  return AppDataSource.getDataSource().getRepository(entity);
}

/**
 * Execute a callback with a master query runner
 * Properly manages connection lifecycle
 * Use for read-after-write scenarios or when you need guaranteed master access
 *
 * @example
 * const donation = await withMasterQueryRunner(async (queryRunner) => {
 *   // Write operation
 *   const donation = Donation.create(data);
 *   await queryRunner.manager.save(donation);
 *
 *   // Read from master immediately after write
 *   const verified = await queryRunner.manager.findOne(Donation, {
 *     where: { id: donation.id }
 *   });
 *
 *   return verified;
 * });
 */
export async function withMasterQueryRunner<T>(
  callback: (queryRunner: any) => Promise<T>,
): Promise<T> {
  const dataSource = AppDataSource.getDataSource();
  const queryRunner = dataSource.createQueryRunner('master');

  try {
    await queryRunner.connect();
    return await callback(queryRunner);
  } finally {
    // CRITICAL: Always release the query runner to return connection to pool
    await queryRunner.release();
  }
}

/**
 * Create a transaction that always uses master
 * (Transactions already use master, but this makes it explicit)
 *
 * @example
 * await withTransaction(async (entityManager) => {
 *   const user = await entityManager.save(User, userData);
 *   const project = await entityManager.save(Project, projectData);
 *   return { user, project };
 * });
 */
export async function withTransaction<T>(
  callback: (entityManager: any) => Promise<T>,
): Promise<T> {
  const dataSource = AppDataSource.getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await callback(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Check if read replicas are configured
 */
export function hasReadReplicas(): boolean {
  const dataSource = AppDataSource.getDataSource();
  const replication = (dataSource.options as PostgresConnectionOptions)
    .replication as any;

  if (!replication || !replication.slaves) {
    return false;
  }

  return replication.slaves.length > 0;
}

/**
 * Get replication configuration info
 */
export function getReplicationInfo() {
  const dataSource = AppDataSource.getDataSource();
  const replication = (dataSource.options as PostgresConnectionOptions)
    .replication as any;

  if (!replication) {
    return {
      enabled: false,
      master: null,
      replicas: [],
      defaultMode: null,
    };
  }

  return {
    enabled: true,
    master: replication.master?.host || 'unknown',
    replicas: (replication.slaves || []).map((s: any) => s.host),
    defaultMode: replication.defaultMode || 'master',
  };
}
