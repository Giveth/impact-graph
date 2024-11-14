import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailVerificationColumns1731071653657
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "emailVerificationCode" VARCHAR,
        ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
        ALTER TABLE "user"
        DROP COLUMN IF EXISTS "emailVerificationCode",
        DROP COLUMN IF EXISTS "isEmailVerified";
    `);
  }
}
