import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMinimumUserAnalysisScoreField1721315639000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='qf_round' AND column_name='minimumUserAnalysisScore'`,
    );

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "qf_round" RENAME COLUMN "minimumUserAnalysisScore" TO "minMBDScore"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnExists = await queryRunner.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='qf_round' AND column_name='minMBDScore'`,
    );

    if (columnExists.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "qf_round" RENAME COLUMN "minMBDScore" TO "minimumUserAnalysisScore"`,
      );
    }
  }
}
