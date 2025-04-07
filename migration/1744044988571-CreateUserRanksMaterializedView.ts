import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRanksMaterializedView1744044988571
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_ranks_materialized_view AS
        SELECT 
            id, 
            "name", 
            "qaccPoints", 
            "walletAddress",
            "projectsFundedCount",
            RANK() OVER (
                ORDER BY "qaccPoints" DESC, 
                         COALESCE("name", "walletAddress") ASC
            ) AS rank 
        FROM "user";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP MATERIALIZED VIEW IF EXISTS user_ranks_materialized_view;
    `);
  }
}
