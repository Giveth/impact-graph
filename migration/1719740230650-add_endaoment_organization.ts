import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEndaomentOrganization1719740230650
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "organization" ("name", "disableNotifications", "disableRecurringDonations", "disableUpdateEnforcement", "label", "website", "supportCustomTokens")
            VALUES ('Endaoment', true, true, true, 'endaoment', 'https://endaoment.org', false);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "organization" WHERE "label" = 'endaoment';
        `);
  }
}
