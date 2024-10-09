import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarlyAccessIndex1727292637656 implements MigrationInterface {
  name = 'AddEarlyAccessIndex1727292637656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "early_access_round" DROP CONSTRAINT "UQ_e2f9598b0bbed3f05ca5c49fedc"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e2f9598b0bbed3f05ca5c49fed" ON "early_access_round" ("roundNumber") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e2f9598b0bbed3f05ca5c49fed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "early_access_round" ADD CONSTRAINT "UQ_e2f9598b0bbed3f05ca5c49fedc" UNIQUE ("roundNumber")`,
    );
  }
}
