import { MigrationInterface, QueryRunner } from 'typeorm';

export class createQfRoundTable1684071046520 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "qf_round" (
                "id" SERIAL NOT NULL,
                "name" text UNIQUE,
                "is_active" boolean NOT NULL DEFAULT true,
                "allocated_fund" integer NOT NULL,
                "begin_date" timestamp without time zone NOT NULL,
                "end_date" timestamp without time zone NOT NULL,
                "updated_at" timestamp without time zone NOT NULL,
                "created_at" timestamp without time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_qf_round_id" PRIMARY KEY ("id")
            );
        `);

    await queryRunner.query(`
            CREATE TABLE "project_qf_round" (
                "project_id" integer NOT NULL,
                "qf_round_id" integer NOT NULL,
                CONSTRAINT "PK_project_qf_round" PRIMARY KEY ("project_id", "qf_round_id")
            );
        `);

    await queryRunner.query(`
            ALTER TABLE "project_qf_round" 
            ADD CONSTRAINT "FK_project_id" 
            FOREIGN KEY ("project_id") 
            REFERENCES "project"("id") 
            ON DELETE CASCADE;
        `);

    await queryRunner.query(`
            ALTER TABLE "project_qf_round" 
            ADD CONSTRAINT "FK_qf_round_id" 
            FOREIGN KEY ("qf_round_id") 
            REFERENCES "qf_round"("id") 
            ON DELETE CASCADE;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "project_qf_round";
        `);

    await queryRunner.query(`
            DROP TABLE "qf_round";
        `);
  }
}
