import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../src/entities/organization';

const { GIVETH, GIVING_BLOCK, TRACE, CHANGE } = ORGANIZATION_LABELS;

export class seedOrganizations1646305490859 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO organization (label,name,website) VALUES
         ('${GIVETH}','Giveth','https://giveth.io'),
         ('${TRACE}','Trace','https://trace.giveth.io'),
         ('${GIVING_BLOCK}','Giving Block','https://thegivingblock.com'),
         ('${CHANGE}','CHANGE','https://getchange.io')
        ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization`);
  }
}
