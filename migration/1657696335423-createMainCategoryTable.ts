import { MigrationInterface, QueryRunner } from 'typeorm';

export class createMainCategoryTable1657696335423
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
         CREATE TABLE IF NOT EXISTS public.main_category
            (
                id SERIAL NOT NULL,
                title text COLLATE pg_catalog."default",
                slug text COLLATE pg_catalog."default",
                description text COLLATE pg_catalog."default",
                banner text COLLATE pg_catalog."default",
                CONSTRAINT "PK_1de960b48ce264cb705906a30d6" PRIMARY KEY (id),
                CONSTRAINT "UQ_94a55911924728435f0a81a4dd2" UNIQUE (title)
            )
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS main_category CASCADE`);
  }
}
