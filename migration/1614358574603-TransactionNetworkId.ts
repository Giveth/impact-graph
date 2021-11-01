import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionNetworkId1614358574603 implements MigrationInterface {
  name = 'TransactionNetworkId1614358574603';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "transactionNetworkId" integer NOT NULL default (1)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "transactionNetworkId"`,
    );
  }
}
