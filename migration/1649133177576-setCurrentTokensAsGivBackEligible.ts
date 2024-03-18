import { MigrationInterface, QueryRunner } from 'typeorm';

export class setCurrentTokensAsGivBackEligible1649133177576
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const tokenTableExists = await queryRunner.hasTable('token');
    if (tokenTableExists) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS "token" ADD COLUMN IF NOT EXISTS "isGivbackEligible" boolean DEFAULT false`,
      );

      // set all current tokens as givBackEligible
      await queryRunner.query(`
                UPDATE token
                SET "isGivbackEligible" = true
            `);
    }
  }

  // Revert the boolean
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE token
        SET "isGivbackEligible" = false
    `);
  }
}
