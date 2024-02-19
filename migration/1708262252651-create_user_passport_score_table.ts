import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserPassportScoreTable1708262252651
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_passport_score" (
        "id" SERIAL PRIMARY KEY,
        "passportScore" INTEGER NOT NULL,
        "passportStamps" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "qfRoundId" INTEGER NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_user" FOREIGN KEY ("userId") REFERENCES "user"("id"),
        CONSTRAINT "FK_qfRound" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round"("id")
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "user_passport_score";
    `);
  }
}
