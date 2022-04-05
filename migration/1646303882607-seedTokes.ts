import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';

export class seedTokes1646303882607 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // typeorm sync hasn't run, so we need to declare the column
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "token" ADD COLUMN IF NOT EXISTS "isGivbackEligible" boolean DEFAULT false`,
    );

    await queryRunner.manager.save(
      Token,
      seedTokens.map(t => {
        t.address = t.address?.toLowerCase();
        return t;
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM token`);
  }
}
