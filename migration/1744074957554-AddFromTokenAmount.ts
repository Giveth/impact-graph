import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromTokenAmountMigration1744074957554
  implements MigrationInterface
{
  name = 'Migration1744074957554';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "fromTokenAmount" double precision NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "draft_donation" ADD "fromTokenAmount" double precision NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "draft_donation" DROP COLUMN "fromTokenAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "fromTokenAmount"`,
    );
  }
}
