import {MigrationInterface, QueryRunner} from "typeorm";

export class DonationRemoveTransactionIdRequired1613572379637 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE donation ALTER COLUMN transactionId DROP NOT NULL;`);
        
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE donation ALTER COLUMN transactionId SET NOT NULL;`);
    }

}
