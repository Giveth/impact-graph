import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerification1724143752405 implements MigrationInterface {
  name = 'EmailVerification1724143752405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_email_verification" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "emailVerificationCode" text, "emailVerificationCodeExpiredAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8ad3e54beb79f46d33950e9d487" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailConfirmed" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailConfirmationSent" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailConfirmationSentAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailConfirmedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD "teaser" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "project" ADD "teamMembers" jsonb`);
    await queryRunner.query(`ALTER TABLE "project" ADD "abc" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "abc"`);
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "teamMembers"`);
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "teaser"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "emailConfirmedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "emailConfirmationSentAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "emailConfirmationSent"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "emailConfirmed"`);
    await queryRunner.query(`DROP TABLE "user_email_verification"`);
  }
}
