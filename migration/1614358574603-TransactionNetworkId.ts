import { MigrationInterface, QueryRunner } from 'typeorm'

export class TransactionNetworkId1614358574603 implements MigrationInterface {
  name = 'TransactionNetworkId1614358574603'

  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "transactionNetworkId" integer NOT NULL default (1)`
    )
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "donation" DROP COLUMN "transactionNetworkId"`
    )
  }
}
