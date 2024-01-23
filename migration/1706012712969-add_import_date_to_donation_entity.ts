import { MigrationInterface, QueryRunner } from 'typeorm';

export class addImportDateToDonationEntity1706012712969
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD COLUMN IF NOT EXISTS  "importDate" TIMESTAMP WITH TIME ZONE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "importDate"`);
  }
}
