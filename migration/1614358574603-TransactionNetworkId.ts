import {MigrationInterface, QueryRunner} from "typeorm";

export class TransactionNetworkId1614358574603 implements MigrationInterface {
    name = 'TransactionNetworkId1614358574603'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation" ADD "transactionNetworkId" integer NOT NULL constraint default_transactionNetworkId default (1)`);
        await queryRunner.query(`ALTER TABLE "project" ADD CONSTRAINT "FK_b6d55aff9b16e061712260da686" FOREIGN KEY ("statusId") REFERENCES "project_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_b6d55aff9b16e061712260da686"`);
        await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "transactionNetworkId"`);
    }

}
