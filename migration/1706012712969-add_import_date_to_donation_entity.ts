import { MigrationInterface, QueryRunner } from "typeorm";

export class addImportDateToDonationEntity1706012712969 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation" ADD COLUMN "importDate" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "donation" DROP COLUMN "importDate"`);
    }

}
