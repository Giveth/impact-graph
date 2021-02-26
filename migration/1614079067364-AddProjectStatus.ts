import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProjectStatus1614079067364 implements MigrationInterface {
    name = 'AddProjectStatus1614079067364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_a9fd7b30180395df453f1373c28"`);
        await queryRunner.query(`CREATE TABLE "project_status" ("id" SERIAL NOT NULL, "symbol" text NOT NULL, "name" character varying, "description" character varying, CONSTRAINT "UQ_0742348e857789fde8cda81a2ce" UNIQUE ("symbol"), CONSTRAINT "PK_625ed5469429a6b32e34ba9f827" PRIMARY KEY ("id"))`);
        
        
        


    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_b6d55aff9b16e061712260da686"`);
        await queryRunner.query(`ALTER TABLE "project" ADD "projectId" integer`);
        await queryRunner.query(`DROP TABLE "project_status"`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_a9fd7b30180395df453f1373c28" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
