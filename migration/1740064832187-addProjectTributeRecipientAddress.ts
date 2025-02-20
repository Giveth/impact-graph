import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTributeRecipientAddress1740064832187
  implements MigrationInterface
{
  name = 'AddProjectTributeRecipientAddress1740064832187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "tributeRecipienteAddress" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "tributeRecipienteAddress"`,
    );
  }
}
