import { MigrationInterface, QueryRunner } from 'typeorm';

export class createProjectTable1662877385200 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectTableExists = await queryRunner.hasTable('project');

    if (projectTableExists) {
      // eslint-disable-next-line no-console
      console.log('Project table already exists');
      return;
    }
    await queryRunner.query(
      `
            CREATE TABLE IF NOT EXISTS public.project
              (
                  id SERIAL NOT NULL,
                  title character varying COLLATE pg_catalog."default" NOT NULL,
                  slug character varying COLLATE pg_catalog."default",
                  "slugHistory" text[] COLLATE pg_catalog."default" NOT NULL DEFAULT '{}'::text[],
                  admin character varying COLLATE pg_catalog."default",
                  description character varying COLLATE pg_catalog."default",
                  "traceCampaignId" character varying COLLATE pg_catalog."default",
                  "givingBlocksId" character varying COLLATE pg_catalog."default",
                  website character varying COLLATE pg_catalog."default",
                  youtube character varying COLLATE pg_catalog."default",
                  "organisationId" integer,
                  "creationDate" timestamp without time zone,
                  "updatedAt" timestamp without time zone,
                  "coOrdinates" character varying COLLATE pg_catalog."default",
                  image character varying COLLATE pg_catalog."default",
                  "impactLocation" character varying COLLATE pg_catalog."default",
                  balance double precision,
                  "stripeAccountId" character varying COLLATE pg_catalog."default",
                  "walletAddress" character varying COLLATE pg_catalog."default",
                  verified boolean NOT NULL,
                  "giveBacks" boolean NOT NULL,
                  "qualityScore" integer,
                  "totalDonations" real NOT NULL,
                  "totalTraceDonations" real NOT NULL DEFAULT '0'::real,
                  "totalReactions" integer NOT NULL DEFAULT 0,
                  "totalProjectUpdates" integer,
                  listed boolean,
                  "statusId" integer,
                  "organizationId" integer,
                  "changeId" character varying COLLATE pg_catalog."default",
                  "isImported" boolean NOT NULL DEFAULT false,
                  "adminUserId" integer,
                  contacts jsonb,
                  "verificationStatus" text COLLATE pg_catalog."default",
                  CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY (id),
                  CONSTRAINT "UQ_86cfc79126642910dd3104cdb29" UNIQUE ("walletAddress"),
                  CONSTRAINT "FK_0028dfadf312a1d7f51656c4a9a" FOREIGN KEY ("organizationId")
                      REFERENCES public.organization (id) MATCH SIMPLE
                      ON UPDATE NO ACTION
                      ON DELETE NO ACTION,
                  CONSTRAINT "FK_b6d55aff9b16e061712260da686" FOREIGN KEY ("statusId")
                      REFERENCES public.project_status (id) MATCH SIMPLE
                      ON UPDATE NO ACTION
                      ON DELETE NO ACTION,
                  CONSTRAINT "FK_da2bed8094dd6e19f78c122d5bd" FOREIGN KEY ("adminUserId")
                      REFERENCES public."user" (id) MATCH SIMPLE
                      ON UPDATE NO ACTION
                      ON DELETE NO ACTION
              )
              TABLESPACE pg_default;
              CREATE UNIQUE INDEX "IDX_230ef230f8b5b301813465b3d5"
                  ON public.project USING btree
                  ("changeId" COLLATE pg_catalog."default" ASC NULLS LAST)
                  TABLESPACE pg_default
                  WHERE "changeId" IS NOT NULL;

              CREATE UNIQUE INDEX "IDX_4834506581f3c8eaddd003f770"
                  ON public.project USING btree
                  ("givingBlocksId" COLLATE pg_catalog."default" ASC NULLS LAST)
                  TABLESPACE pg_default
                  WHERE "givingBlocksId" IS NOT NULL;

              CREATE INDEX "IDX_6fce32ddd71197807027be6ad3"
                  ON public.project USING btree
                  (slug COLLATE pg_catalog."default" ASC NULLS LAST)
                  TABLESPACE pg_default;

              CREATE INDEX "IDX_b567170a13f26c67548fd9d159"
                  ON public.project USING btree
                  ("slugHistory" COLLATE pg_catalog."default" ASC NULLS LAST)
                  TABLESPACE pg_default;

              CREATE INDEX "IDX_b6d55aff9b16e061712260da68"
                  ON public.project USING btree
                  ("statusId" ASC NULLS LAST)
                  TABLESPACE pg_default;

              CREATE INDEX "IDX_da2bed8094dd6e19f78c122d5b"
                  ON public.project USING btree
                  ("adminUserId" ASC NULLS LAST)
                  TABLESPACE pg_default;
                      `,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
