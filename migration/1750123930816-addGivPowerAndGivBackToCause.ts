import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGivPowerAndGivBackToCause1750123930816
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      ADD COLUMN "givPower" float NOT NULL DEFAULT 0,
      ADD COLUMN "givBack" float NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cause"
      DROP COLUMN "givPower",
      DROP COLUMN "givBack";
    `);
  }
}
