import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalysisScoreToUser1732584356154 implements MigrationInterface {
  name = 'AddAnalysisScoreToUser1732584356154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "analysisScore" real`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "analysisScore"`);
  }
}
