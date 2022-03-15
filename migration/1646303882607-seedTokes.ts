import { MigrationInterface, QueryRunner } from 'typeorm';
import { Token } from '../src/entities/token';
import seedTokens from './data/seedTokens';

export class seedTokes1646303882607 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
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
