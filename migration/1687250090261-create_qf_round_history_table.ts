import { MigrationInterface, QueryRunner } from 'typeorm';

export class createQfRoundHistoryTable1687250090261
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "qf_round_history" (
                "id" SERIAL NOT NULL,
                "projectId" integer,
                "qfRoundId" integer,
                "uniqueDonors" integer NOT NULL DEFAULT 0,
                "donationsCount" integer NOT NULL DEFAULT 0,
                "raisedFundInUsd" real NOT NULL DEFAULT 0,
                "matchingFund" real NOT NULL DEFAULT 0,
                "distributedFundTxHash" text,
                "distributedFundNetwork" text,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_qf_round_history_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_project_qfround" UNIQUE ("projectId", "qfRoundId"),
                CONSTRAINT "FK_qfRound_history_projectId" FOREIGN KEY ("projectId") REFERENCES "project" ("id"),
                CONSTRAINT "FK_qf_round_history_qfRoundId" FOREIGN KEY ("qfRoundId") REFERENCES "qf_round" ("id")
            );
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "qf_round_history";
        `);
  }
}
