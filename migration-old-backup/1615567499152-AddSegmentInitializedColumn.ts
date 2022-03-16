import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentInitializedColumn1615567499152
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD IF NOT EXISTS "segmentIdentified" boolean default false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "segmentIdentified"`,
    );
  }
}
