import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectsFundedCount1742435597840 implements MigrationInterface {
  name = 'Migration1742435597840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "projectsFundedCount" real NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "projectsFundedCount"`,
    );
  }
}
