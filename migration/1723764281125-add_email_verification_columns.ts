import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationColumns1723764281125
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN IF NOT EXISTS "verificationCode" VARCHAR,
            ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN DEFAULT false;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN IF EXISTS "verificationCode",
            DROP COLUMN IF EXISTS "isEmailVerified";
        `);
  }
}
