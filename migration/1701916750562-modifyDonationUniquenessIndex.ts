import { MigrationInterface, QueryRunner } from 'typeorm';
import { logger } from '../src/utils/logger';

export class modifyDonationUniquenessIndex1701916750562
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_c9db9fd133378af80c3521bb146";`,
    );
    await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_c9db9fd133378af80c3521bb146" 
            ON public.donation ("transactionId", "toWalletAddress", "currency") 
            WHERE transactionId IS NOT NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_c9db9fd133378af80c3521bb146";`,
    );
    await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_c9db9fd133378af80c3521bb146" 
        ON public.donation ("transactionId", "toWalletAddress", "currency") 
    `);
  }
}
