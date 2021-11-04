import { MigrationInterface, QueryRunner } from 'typeorm';

export class makeWalletAddressNotNull1634808878248
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "project" ALTER COLUMN "walletAddress" SET NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
