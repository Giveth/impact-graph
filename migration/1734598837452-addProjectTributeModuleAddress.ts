import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTributeModuleAddress1734598837452
  implements MigrationInterface
{
  name = 'AddProjectTributeModuleAddress1734598837452';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "tributeClaimModuleAddress" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "tributeClaimModuleAddress"`,
    );
  }
}
