import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoundCaps1727434746651 implements MigrationInterface {
  name = 'AddRoundCaps1727434746651';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "roundUSDCapPerProject" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "roundUSDCapPerUserPerProject" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "POLPriceAtRoundStart" numeric(18,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "roundUSDCapPerProject" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "roundUSDCapPerUserPerProject" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD "POLPriceAtRoundStart" numeric(18,8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "POLPriceAtRoundStart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "roundUSDCapPerUserPerProject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP COLUMN "roundUSDCapPerProject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "POLPriceAtRoundStart"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "roundUSDCapPerUserPerProject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "roundUSDCapPerProject"`,
    );
  }
}
