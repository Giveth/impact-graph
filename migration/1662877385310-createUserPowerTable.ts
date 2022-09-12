import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUserPowerTable1662877385310 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                CREATE TABLE IF NOT EXISTS public.user_power
                (
                    id SERIAL NOT NULL,
                    "fromTimestamp" timestamp without time zone NOT NULL,
                    "toTimestamp" timestamp without time zone NOT NULL,
                    "givbackRound" integer NOT NULL,
                    "userId" integer NOT NULL,
                    power double precision,
                    CONSTRAINT "PK_dbd158ab51a0cb302550474c0f8" PRIMARY KEY (id),
                    CONSTRAINT "UQ_637329a1dae0f6cba01150c8acf" UNIQUE ("userId", "givbackRound"),
                    CONSTRAINT "FK_2020cfc98924d29b236fb5de540" FOREIGN KEY ("userId")
                        REFERENCES public."user" (id) MATCH SIMPLE
                        ON UPDATE NO ACTION
                        ON DELETE NO ACTION
                )
                
                TABLESPACE pg_default;
                
                ALTER TABLE public.user_power
                    OWNER to postgres;
                
                CREATE INDEX "IDX_2020cfc98924d29b236fb5de54"
                    ON public.user_power USING btree
                    ("userId" ASC NULLS LAST)
                    TABLESPACE pg_default;
          `,
    );
  }

  // tslint:disable-next-line:no-empty
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_power CASCADE`);
  }
}
