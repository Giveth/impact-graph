import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexForProjectFraudTable1709460028924
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Identify and Resolve Duplicates
    // Example strategy: Keep the first record and delete the rest
    await queryRunner.query(`
      DELETE FROM project_fraud
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM sybil
        GROUP BY "projectId", "qfRoundId"
      );
    `);

    // Step 2: Create Unique Index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_PROJECTID_QFROUNDID" ON "project_fraud" ("projectId", "qfRoundId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_PROJECTID_QFROUNDID";
    `);
  }
}
