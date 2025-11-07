import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwitterAndTelegramToUser1731010000000
  implements MigrationInterface
{
  name = 'AddTwitterAndTelegramToUser1731010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add twitter_url column to user table
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN "twitterName" character varying
    `);

    // Add telegram_url column to user table
    await queryRunner.query(`
      ALTER TABLE "user" 
      ADD COLUMN "telegramName" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop telegram_url column
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN IF EXISTS "telegramName"
    `);

    // Drop twitter_url column
    await queryRunner.query(`
      ALTER TABLE "user" 
      DROP COLUMN IF EXISTS "twitterName"
    `);
  }
}
