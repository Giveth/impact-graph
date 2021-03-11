import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEthPriceColumnDonationTable1614601491700 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation" ADD "valueEth" double precision NULL`);
    }


    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "valueEth"`);
    }

}
