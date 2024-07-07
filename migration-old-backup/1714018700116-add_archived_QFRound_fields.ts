import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchivedQFRoundFields1714018700116
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "qf_round" 
          ADD COLUMN IF NOT EXISTS "bannerBgImage" character varying,
          ADD COLUMN IF NOT EXISTS "sponsorsImgs" character varying[] DEFAULT '{}' NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          ALTER TABLE "qf_round" 
          DROP COLUMN IF EXISTS "bannerBgImage",
          DROP COLUMN IF EXISTS "sponsorsImgs"
        `);
  }
}
