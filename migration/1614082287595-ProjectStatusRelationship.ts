import {MigrationInterface, QueryRunner} from "typeorm";

export class ProjectStatusRelationship1614082287595 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
         //wtf? await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "projectId"`);
         await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_b6d55aff9b16e061712260da686" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
         
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_a9fd7b30180395df453f1373c28"`);
    }

}
