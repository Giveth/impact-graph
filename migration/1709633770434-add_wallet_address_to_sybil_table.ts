import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletAddressToSybilTable1709633770434
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE sybil
            ADD COLUMN IF NOT EXISTS "walletAddress" text;
        `);

    await queryRunner.query(`
           UPDATE sybil
            SET "walletAddress" = u."walletAddress"
            FROM public.user as u
            WHERE sybil."userId" = u.id;

    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE sybil
        DROP COLUMN IF EXISTS "walletAddress";
    `);
  }
}
