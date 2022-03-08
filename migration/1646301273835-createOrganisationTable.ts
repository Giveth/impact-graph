import { MigrationInterface, QueryRunner } from 'typeorm';

export class createOrganisationTable1646301273835
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                    CREATE TABLE IF NOT EXISTS organization
            (
                id SERIAL NOT NULL,
                name text COLLATE pg_catalog."default" NOT NULL,
                website text COLLATE pg_catalog."default",
                label text COLLATE pg_catalog."default",
                CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY (id)
            )
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('organization')) {
      await queryRunner.query(`DROP TABLE "organization"`);
    }
  }
}
