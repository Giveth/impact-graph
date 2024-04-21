import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectStatus1614079067364 implements MigrationInterface {
  name = 'AddProjectStatus1614079067364';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "project_status" ("id" SERIAL NOT NULL, "symbol" text NOT NULL, "name" character varying, "description" character varying, CONSTRAINT "UQ_0742348e857789fde8cda81a2ce" UNIQUE ("symbol"), CONSTRAINT "PK_625ed5469429a6b32e34ba9f827" PRIMARY KEY ("id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`DROP TABLE "project_status"`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('AddProjectStatus1614079067364 error', e);
    }
  }
}
