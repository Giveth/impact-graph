import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedOrganizations1646305490859 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`INSERT INTO organization (name,website) VALUES 
         ('Giveth','https://giveth.io'),
         ('Trace','https://trace.giveth.io'),
         ('Giving Block','https://thegivingblock.com'),
         ('CHANGE','https://getchange.io')
        ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM organization`);
  }
}
