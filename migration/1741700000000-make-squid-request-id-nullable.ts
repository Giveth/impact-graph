import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSquidRequestIdNullable1741700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "swap_transaction"
      ALTER COLUMN "squidRequestId" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "swap_transaction"
      ALTER COLUMN "squidRequestId" SET NOT NULL;
    `);
  }
}
