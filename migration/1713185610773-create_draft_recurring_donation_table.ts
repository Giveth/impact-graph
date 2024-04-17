import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDraftRecurringDonationTable1713185610773
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE draft_recurring_donation (
        id SERIAL PRIMARY KEY,
        "networkId" INT NOT NULL,
        "flowRate" TEXT NOT NULL,
        "chainType" VARCHAR(255) DEFAULT 'EVM' NOT NULL,
        "currency" VARCHAR(255) NOT NULL,
        "isBatch" BOOLEAN DEFAULT false,
        "anonymous" BOOLEAN DEFAULT false,
        "isForUpdate" BOOLEAN DEFAULT false,
        "projectId" INT,
        "donorId" INT,
        "status" VARCHAR(255) DEFAULT 'pending' NOT NULL,
        "matchedRecurringDonationId" INT,
        "origin" TEXT,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS draft_recurring_donation;`);
  }
}
