import { MigrationInterface, QueryRunner } from 'typeorm';

export class createQfRoundTable1684071046520 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "qf_round" (
                "id" SERIAL NOT NULL,
                "name" text,
                "isActive" boolean,
                "allocatedFund" integer NOT NULL,
                "beginDate" timestamp without time zone NOT NULL,
                "endDate" timestamp without time zone NOT NULL,
                "minimumPassportScore" real NOT NULL DEFAULT 0,
                "minimumValidUsdValue" FLOAT DEFAULT 1,
                "eligibleNetworks" integer array DEFAULT ARRAY[]::integer[],
                "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
                "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_qfRoundId" PRIMARY KEY ("id")
            );
        `);

    await queryRunner.query(`
            CREATE TABLE "project_qf_rounds_qf_round" (
                "projectId" integer NOT NULL,
                "qfRoundId" integer NOT NULL,
                CONSTRAINT "PK_project_qf_rounds_qf_round" PRIMARY KEY ("projectId", "qfRoundId")
            );
        `);

    await queryRunner.query(`
            ALTER TABLE "project_qf_rounds_qf_round" 
            ADD CONSTRAINT "FK_projectId" 
            FOREIGN KEY ("projectId") 
            REFERENCES "project"("id") 
            ON DELETE CASCADE;
        `);

    await queryRunner.query(`
            ALTER TABLE "project_qf_rounds_qf_round" 
            ADD CONSTRAINT "FK_qfRoundId" 
            FOREIGN KEY ("qfRoundId") 
            REFERENCES "qf_round"("id") 
            ON DELETE CASCADE;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "project_qf_rounds_qf_round";
        `);

    await queryRunner.query(`
            DROP TABLE "qf_round";
        `);
  }
}
