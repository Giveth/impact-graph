import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeUserPassportScoreType1687087766985
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."user" ALTER COLUMN "passportScore" TYPE real`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."user" ALTER COLUMN "passportScore" TYPE integer`,
    );
  }
}
