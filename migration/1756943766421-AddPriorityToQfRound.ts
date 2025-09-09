import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityToQfRound1756943766421 implements MigrationInterface {
  name = 'AddPriorityToQfRound1756943766421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "priority" integer DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "qf_round" DROP COLUMN "priority"`);
  }
}
