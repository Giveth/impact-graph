import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAnonymousDonationBoolean1638386837934
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE donation SET anonymous = true WHERE "userId" IS NULL',
    );
    await queryRunner.query(
      'UPDATE donation SET anonymous = false WHERE "userId" IS NOT NULL',
    );
  }

  // Revert in case something happens, seems only the new design will use this
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "donation" SET anonymous = false WHERE "userId" IS NULL',
    );
    await queryRunner.query(
      'UPDATE "donation" SET anonymous = true WHERE "userId" IS NOT NULL',
    );
  }
}
