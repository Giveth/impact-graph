import { MigrationInterface, QueryRunner } from 'typeorm';

export class createPowerBoostingTable1662877385300
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const powerBoostingTableExists =
      await queryRunner.hasTable('power_boosting');

    if (powerBoostingTableExists) {
      // eslint-disable-next-line no-console
      console.log('createPowerBoostingTable power_boosting table exists');
      return;
    }
    await queryRunner.query(
      `

            CREATE TABLE IF NOT EXISTS public.power_boosting
            (
                id SERIAL NOT NULL,
                "projectId" integer NOT NULL,
                "userId" integer NOT NULL,
                percentage numeric(5,2) NOT NULL,
                "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
                "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
                CONSTRAINT "PK_df65f35d7ae777bb6c796aa3853" PRIMARY KEY (id),
                CONSTRAINT "FK_6efb547c681f29c39e1c5391857" FOREIGN KEY ("userId")
                    REFERENCES public."user" (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE NO ACTION,
                CONSTRAINT "FK_e22ae58004aa092dcb637bedd09" FOREIGN KEY ("projectId")
                    REFERENCES public.project (id) MATCH SIMPLE
                    ON UPDATE NO ACTION
                    ON DELETE NO ACTION
            )
            TABLESPACE pg_default;
            CREATE INDEX "IDX_6efb547c681f29c39e1c539185"
                ON public.power_boosting USING btree
                ("userId" ASC NULLS LAST)
                TABLESPACE pg_default;

            CREATE INDEX "IDX_e22ae58004aa092dcb637bedd0"
                ON public.power_boosting USING btree
                ("projectId" ASC NULLS LAST)
                TABLESPACE pg_default;

            CREATE UNIQUE INDEX "IDX_f2a4cc9f7365bdce613f2ead9f"
                ON public.power_boosting USING btree
                ("projectId" ASC NULLS LAST, "userId" ASC NULLS LAST)
                TABLESPACE pg_default;
                      `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS power_boosting CASCADE`);
  }
}
