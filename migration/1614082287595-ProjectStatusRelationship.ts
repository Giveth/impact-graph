import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectStatusRelationship1614082287595
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // wtf? await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "projectId"`);
    await queryRunner.query(`UPDATE "project" SET "statusId" = 5`);

    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_b6d55aff9b16e061712260da686" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_b6d55aff9b16e061712260da686"`,
    );
  }
}
