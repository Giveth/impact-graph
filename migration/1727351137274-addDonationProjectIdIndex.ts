import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationProjectIdIndex1727351137274
  implements MigrationInterface
{
  name = 'AddDonationProjectIdIndex1727351137274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "verified_project_id" ON "donation" ("projectId") WHERE status = 'verified'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."verified_project_id"`);
  }
}
