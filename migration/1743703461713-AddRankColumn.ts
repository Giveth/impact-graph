import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankColumnmigration1743703461713 implements MigrationInterface {
  name = 'Migration1743703461713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "rank" real NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rank"`);
  }
}
