import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftDonationTable1707738577647 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_donation_chaintype_enum') THEN
            CREATE TYPE public.draft_donation_chaintype_enum AS ENUM
            ('EVM', 'SOLANA');
        END IF;

        ALTER TYPE public.draft_donation_chaintype_enum
        OWNER TO postgres;
    END$$;`);

    await queryRunner.query(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_donation_status_enum') THEN
			CREATE TYPE public.draft_donation_status_enum AS ENUM
    			('pending', 'matched', 'failed');
 		END IF;

		ALTER TYPE public.draft_donation_status_enum
		    OWNER TO postgres;
    END$$;
    `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.draft_donation
            (
                id integer NOT NULL DEFAULT nextval('draft_donation_id_seq'::regclass),
                "networkId" integer NOT NULL,
                "chainType" draft_donation_chaintype_enum NOT NULL DEFAULT 'EVM'::draft_donation_chaintype_enum,
                status draft_donation_status_enum NOT NULL DEFAULT 'pending'::draft_donation_status_enum,
                "toWalletAddress" character varying COLLATE pg_catalog."default" NOT NULL,
                "fromWalletAddress" character varying COLLATE pg_catalog."default" NOT NULL,
                "tokenAddress" character varying COLLATE pg_catalog."default",
                currency character varying COLLATE pg_catalog."default" NOT NULL,
                anonymous boolean,
                amount real NOT NULL,
                "projectId" integer,
                "userId" integer,
                "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
                "referrerId" character varying COLLATE pg_catalog."default",
                "expectedCallData" character varying COLLATE pg_catalog."default",
                "errorMessage" character varying COLLATE pg_catalog."default",
                CONSTRAINT "PK_4f2eb58b84fb470edcd483c78af" PRIMARY KEY (id)
            )

            TABLESPACE pg_default;

            ALTER TABLE IF EXISTS public.draft_donation
                OWNER to postgres;

            CREATE INDEX IF NOT EXISTS "IDX_287bf9818fca5b436122847223"
                ON public.draft_donation USING btree
                ("userId" ASC NULLS LAST)
                TABLESPACE pg_default
                WHERE status = 'pending'::draft_donation_status_enum;

            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_af180374473ea402e7595196a6"
                ON public.draft_donation USING btree
                ("fromWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, "toWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, "networkId" ASC NULLS LAST, amount ASC NULLS LAST, currency COLLATE pg_catalog."default" ASC NULLS LAST)
                TABLESPACE pg_default
                WHERE status = 'pending'::draft_donation_status_enum;

            CREATE INDEX IF NOT EXISTS "IDX_029453ee31e092317f7f96ee3b"
                ON public.draft_donation USING btree
                ("createdAt" ASC NULLS LAST)
                TABLESPACE pg_default;

            CREATE INDEX IF NOT EXISTS "IDX_ff4b8666a0090d059f00c59216"
                ON public.draft_donation USING btree
                (status ASC NULLS LAST)
                TABLESPACE pg_default
                WHERE status = 'pending'::draft_donation_status_enum;
        `);

    await queryRunner.query(`
        CREATE SEQUENCE IF NOT EXISTS public.draft_donation_id_seq
        INCREMENT 1
        START 1
        MINVALUE 1
        MAXVALUE 2147483647
        CACHE 1
        OWNED BY draft_donation.id;

        ALTER SEQUENCE public.draft_donation_id_seq
        OWNER TO postgres;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
