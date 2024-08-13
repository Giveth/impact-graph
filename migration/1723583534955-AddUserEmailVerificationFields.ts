import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailVerificationFields1723583534955
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD "emailConfirmationToken" character varying,
      ADD "emailConfirmationTokenExpiredAt" TIMESTAMP,
      ADD "emailConfirmed" boolean DEFAULT false,
      ADD "emailConfirmationSent" boolean DEFAULT false,
      ADD "emailConfirmationSentAt" TIMESTAMP,
      ADD "emailConfirmedAt" TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "emailConfirmationToken",
      DROP COLUMN "emailConfirmationTokenExpiredAt",
      DROP COLUMN "emailConfirmed",
      DROP COLUMN "emailConfirmationSent",
      DROP COLUMN "emailConfirmationSentAt",
      DROP COLUMN "emailConfirmedAt";
    `);
  }
}
