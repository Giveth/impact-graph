import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueProjectAdressWithMomoForStellar1725188424424
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE UNIQUE INDEX unique_stellar_address
        ON project_address (address, memo)
        WHERE "chainType" = 'STELLAR';
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX unique_stellar_address;
    `);
  }
}
