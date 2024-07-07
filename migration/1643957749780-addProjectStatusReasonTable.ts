import { MigrationInterface, QueryRunner } from 'typeorm';

export class addProjectStatusReasonTable1643957749780
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS public.project_status_reason
              (
                  id serial NOT NULL,
                  description character varying,
                  "statusId" integer,
                  CONSTRAINT "PK_453e771767c65a08619aff4ba53" PRIMARY KEY (id),
                  CONSTRAINT "FK_2edf0fca3c1aca99d1c4924e6a2" FOREIGN KEY ("statusId")
                      REFERENCES public.project_status (id) MATCH SIMPLE
              )
`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
