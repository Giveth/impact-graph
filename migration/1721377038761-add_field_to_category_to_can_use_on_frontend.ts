import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldToCategoryToCanUseOnFrontend1721377038761
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "category"
            ADD COLUMN "canUseOnFrontend" boolean DEFAULT true;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "category"
            DROP COLUMN "canUseOnFrontend";
        `);
  }
}
