import { MigrationInterface, QueryRunner } from 'typeorm';

export class addSafeTransactionIdToDonation1701792159998
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                      ALTER TABLE donation
                      ADD COLUMN IF NOT EXISTS "safeTransactionId" character varying DEFAULT null
               `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
                      ALTER TABLE donation
                      DROP "safeTransactionId"
               `,
    );
  }
}
