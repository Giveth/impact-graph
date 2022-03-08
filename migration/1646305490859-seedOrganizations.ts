import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedOrganizations1646305490859 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO organization (label,name,website) VALUES 
         ('giveth','Giveth','https://giveth.io'),
         ('trace','Trace','https://trace.giveth.io'),
         ('givingBlock','Giving Block','https://thegivingblock.com'),
         ('change','CHANGE','https://getchange.io')
        ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization`);
  }
}
