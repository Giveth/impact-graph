import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeasonNumberToProject1740426458329
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" ADD "seasonNumber" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "seasonNumber"`);
  }
}
