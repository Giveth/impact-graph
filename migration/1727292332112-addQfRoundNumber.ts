import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQfRoundNumber1727292332112 implements MigrationInterface {
  name = 'AddQfRoundNumber1727292332112';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "qf_round" ADD "roundNumber" integer`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dcf0b97d90c86ba737f6362542" ON "qf_round" ("roundNumber") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dcf0b97d90c86ba737f6362542"`,
    );
    await queryRunner.query(`ALTER TABLE "qf_round" DROP COLUMN "roundNumber"`);
  }
}
