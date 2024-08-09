import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDraftDonationIndex1722860378721
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_af180374473ea402e7595196a6"`);
    await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_af180374473ea402e7595196a6"
        ON public.draft_donation USING btree
        ("fromWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, 
        "toWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, 
        "networkId" ASC NULLS LAST, 
        amount ASC NULLS LAST, 
        currency COLLATE pg_catalog."default" ASC NULLS LAST)
        TABLESPACE pg_default
        WHERE status = 'pending'::draft_donation_status_enum AND "isQRDonation" = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_af180374473ea402e7595196a6"`);
    await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "IDX_af180374473ea402e7595196a6"
        ON public.draft_donation USING btree
        ("fromWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, 
        "toWalletAddress" COLLATE pg_catalog."default" ASC NULLS LAST, 
        "networkId" ASC NULLS LAST, 
        amount ASC NULLS LAST, 
        currency COLLATE pg_catalog."default" ASC NULLS LAST)
        TABLESPACE pg_default
        WHERE status = 'pending'::draft_donation_status_enum;
    `);
  }
}
