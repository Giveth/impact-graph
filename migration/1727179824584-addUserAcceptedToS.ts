import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAcceptedToS1727179824584 implements MigrationInterface {
  name = 'AddUserAcceptedToS1727179824584';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "acceptedToS" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "acceptedToSDate" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "reviewStatus" SET DEFAULT 'Listed'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "reviewStatus" SET DEFAULT 'Not Reviewed'`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "acceptedToSDate"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "acceptedToS"`);
  }
}
