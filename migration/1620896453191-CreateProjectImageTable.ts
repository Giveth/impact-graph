import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateProjectImageTable1620896453191 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS project_image (
            id serial PRIMARY KEY,
            url character varying,
            "projectId" INT NOT NULL,
            FOREIGN KEY ("projectId")
               REFERENCES project (id)
         );`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "project_image"`)
    }

}
