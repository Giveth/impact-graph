import {MigrationInterface, QueryRunner} from "typeorm";

export class addnullableTransactionId1701979390554 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public.donation ALTER COLUMN "transactionId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE public.donation ALTER COLUMN "transactionId" SET NOT NULL`);
    }

}
