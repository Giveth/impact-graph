import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexForSybilTable1708256080054
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Identify and Resolve Duplicates
    // Example strategy: Keep the first record and delete the rest
    await queryRunner.query(`
      DELETE FROM sybil
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM sybil
        GROUP BY "userId", "qfRoundId"
      );
    `);

    // Step 2: Create Unique Index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_USERID_QFROUNDID" ON "sybil" ("userId", "qfRoundId");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_USERID_QFROUNDID";
    `);
  }
}
