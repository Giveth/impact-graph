import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToTokenAmountMigration1744059552128
  implements MigrationInterface
{
  name = 'Migration1744059552128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "toTokenAmount" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "draft_donation" ADD "toTokenAmount" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "draft_donation" DROP COLUMN "toTokenAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "toTokenAmount"`,
    );
  }
}
