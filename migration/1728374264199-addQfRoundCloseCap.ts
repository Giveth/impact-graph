import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQfRoundCloseCap1728374264199 implements MigrationInterface {
  name = 'AddQfRoundCloseCap1728374264199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "roundUSDCloseCapPerProject" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "roundUSDCloseCapPerProject"`,
    );
  }
}
