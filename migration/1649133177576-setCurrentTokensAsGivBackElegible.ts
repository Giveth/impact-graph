import { MigrationInterface, QueryRunner } from 'typeorm';

export class setCurrentTokensAsGivBackElegible1649133177576
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "token" ADD COLUMN IF NOT EXISTS "isGivbackElegible" boolean DEFAULT false`,
    );

    // set all current tokens as givBackElegible
    await queryRunner.query(`
            UPDATE token
            SET "isGivbackElegible" = true
        `);
  }

  // Revert the boolean
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE token
        SET "isGivbackElegible" = false
    `);
  }
}
