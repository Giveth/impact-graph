import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIndexForSybilTable1708256080054
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
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
