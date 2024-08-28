import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeProjectAddressToSepolia1724168597216
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const projectAddressTableExists =
      await queryRunner.hasTable('project_address');
    if (!projectAddressTableExists) {
      // eslint-disable-next-line no-console
      console.log('The project_address table doesn’t exist');
      return;
    }
    await queryRunner.query(`
            UPDATE project_address
            SET "networkId" = 11155111
            WHERE "networkId" = 5
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const projectAddressTableExists =
      await queryRunner.hasTable('project_address');
    if (!projectAddressTableExists) {
      // eslint-disable-next-line no-console
      console.log('The project_address table doesn’t exist');
      return;
    }
    await queryRunner.query(`
            UPDATE project_address
            SET "networkId" = 5
            WHERE "networkId" = 11155111
        `);
  }
}
