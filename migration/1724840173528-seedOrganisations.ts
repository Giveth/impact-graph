import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../src/entities/organization';

const { GIVETH, TRACE, CHANGE } = ORGANIZATION_LABELS;

export class SeedOrganisations1724840173528 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO organization (label,name,website) VALUES
             ('${GIVETH}','Giveth','https://giveth.io'),
             ('${TRACE}','Trace','https://trace.giveth.io'),
             ('${CHANGE}','CHANGE','https://getchange.io')
            ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization`);
  }
}
