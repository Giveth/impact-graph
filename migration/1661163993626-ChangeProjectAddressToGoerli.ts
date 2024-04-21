import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeProjectAddressToGoerli1661163993626
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectAddressTableExists =
      await queryRunner.hasTable('project_address');
    if (!projectAddressTableExists) {
      // eslint-disable-next-line no-console
      console.log('The project_address table doesnt exist');
      return;
    }
    await queryRunner.query(`
            UPDATE project_address
            SET "networkId" = 5
            WHERE "networkId" = 3
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const projectAddressTableExists =
      await queryRunner.hasTable('project_address');
    if (!projectAddressTableExists) {
      // eslint-disable-next-line no-console
      console.log('The project_address table doesnt exist');
      return;
    }
    await queryRunner.query(`
            UPDATE project_address
            SET "networkId" = 3
            WHERE "networkId" = 5
        `);
  }
}
