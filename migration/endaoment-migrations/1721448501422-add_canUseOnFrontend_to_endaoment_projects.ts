import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanUseOnFrontendToEndaomentProjects1721448501422
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "category"
            SET "canUseOnFrontend" = false
            WHERE "value" = 'Endaoment';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "category"
            SET "canUseOnFrontend" = true
            WHERE "value" = 'Endaoment';
        `);
  }
}
