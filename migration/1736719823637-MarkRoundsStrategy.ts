import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkRoundsStrategy1736719823637 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "qf_strategy_enum" AS ENUM ('cocm', 'regular');
    `);

    await queryRunner.query(`
            ALTER TABLE "qf_round"
            ADD COLUMN "qfStrategy" "qf_strategy_enum" DEFAULT 'regular';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "qf_round"
            DROP COLUMN "qfStrategy";
        `);
    await queryRunner.query(`
            DROP TYPE "qf_strategy_enum";
        `);
  }
}
