import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEndaomentNeededFieldsToOrganization1719738529935
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "organization"
            ADD COLUMN "disableUpdateEnforcement" BOOLEAN DEFAULT false,
            ADD COLUMN "disableNotifications" BOOLEAN DEFAULT false,
            ADD COLUMN "disableRecurringDonations" BOOLEAN DEFAULT false;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "organization"
            DROP COLUMN "disableUpdateEnforcement",
            DROP COLUMN "disableNotifications",
            DROP COLUMN "disableRecurringDonations";
        `);
  }
}
