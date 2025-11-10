import {
  DataSource,
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
 * Force a SELECT query to use the master database
 * Use this for critical reads that need absolute consistency
 *
 * @example
 * const query = User.createQueryBuilder('user')
 *   .where('user.id = :id', { id: userId });
 *
 * const user = await useMasterForQuery(query).getOne();
 */
export function useMasterForQuery<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  const dataSource = AppDataSource.getDataSource();

  // Create a query runner explicitly for master connection
  const masterQueryRunner = dataSource.createQueryRunner('master');

  return queryBuilder.setQueryRunner(masterQueryRunner);
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
 * Execute a callback with master connection guaranteed
 * Use for read-after-write scenarios
 *
 * @example
 * await withMasterConnection(async (masterDataSource) => {
 *   const donation = await createDonation(data);
 *
 *   // Read from master immediately after write
 *   const verified = await masterDataSource
 *     .getRepository(Donation)
 *     .findOne({ where: { id: donation.id } });
 *
 *   return verified;
 * });
 */
export async function withMasterConnection<T>(
  callback: (masterDataSource: DataSource) => Promise<T>,
): Promise<T> {
  // AdminDataSource always uses master
  return await callback(AdminDataSource.getDataSource());
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
