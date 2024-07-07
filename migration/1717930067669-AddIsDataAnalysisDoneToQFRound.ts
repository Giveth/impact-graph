import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDataAnalysisDoneToQFRound1717930067669
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "qf_round" ADD COLUMN IF NOT EXISTS "isDataAnalysisDone" BOOLEAN DEFAULT FALSE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "qf_round" DROP COLUMN IF EXISTS "isDataAnalysisDone";
    `);
  }
}
