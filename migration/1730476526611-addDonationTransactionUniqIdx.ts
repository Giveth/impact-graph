import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDonationTransactionUniqIdx1730476526611
  implements MigrationInterface
{
  name = 'AddDonationTransactionUniqIdx1730476526611';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "unique_transaction_id" ON "donation" ("transactionId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."unique_transaction_id"`);
  }
}
