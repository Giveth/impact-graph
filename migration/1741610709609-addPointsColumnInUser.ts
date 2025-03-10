import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointsColumnInUser1741610709609 implements MigrationInterface {
  name = 'Migration1741610709609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "qaccPoints" real NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "qaccPointsMultiplier" real NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "qaccPointsMultiplier"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "qaccPoints"`);
  }
}
