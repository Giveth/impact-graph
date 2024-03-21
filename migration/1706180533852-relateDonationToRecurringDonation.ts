import { MigrationInterface, QueryRunner } from 'typeorm';

export class relateDonationToRecurringDonation1706180533852
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donation"
            ADD COLUMN "recurringDonationId" integer,
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recurringDonationId" ON "donation" ("recurringDonationId");
        `);

    await queryRunner.query(`
            ALTER TABLE "donation" 
            ADD CONSTRAINT "FK_recurringDonationId" 
            FOREIGN KEY ("recurringDonationId") 
            REFERENCES "recurring_donation"("id") 
            ON DELETE SET NULL;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "donation" 
            DROP CONSTRAINT "FK_recurringDonationId";
        `);

    await queryRunner.query(`
            DROP INDEX "IDX_recurringDonationId";
        `);

    await queryRunner.query(`
            ALTER TABLE "donation"
            DROP COLUMN "recurringDonationId",
        `);
  }
}
