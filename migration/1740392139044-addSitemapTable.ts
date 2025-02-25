import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSitemapTable1740392139044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.sitemap_url
      (
          "id" SERIAL NOT NULL,
          "sitemap_urls" JSONB NOT NULL,
          "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "PK_sitemap_url_id" PRIMARY KEY ("id")
      );

      CREATE INDEX IF NOT EXISTS "IDX_sitemap_url_created_at"
          ON public.sitemap_url USING btree ("created_at" ASC NULLS LAST);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS public.sitemap_url;
    `);
  }
}
