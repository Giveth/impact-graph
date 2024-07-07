import { MigrationInterface, QueryRunner } from 'typeorm';

export class fillMainnetAddressForSomeTokens1647927483869
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE token
            ADD IF NOT EXISTS "mainnetAddress" TEXT
            `);
    await queryRunner.query(
      `
       UPDATE token
       SET "mainnetAddress"='0xda007777d86ac6d989cc9f79a73261b3fc5e0da0'
       WHERE "networkId"= 100  AND symbol='XNODE'
      `,
    );
    await queryRunner.query(
      `
       UPDATE token
       SET "mainnetAddress"='0xD533a949740bb3306d119CC777fa900bA034cd52'
       WHERE "networkId"= 100 AND symbol='CRV'
      `,
    );
    await queryRunner.query(
      `
       UPDATE token
       SET "mainnetAddress"='0xd56dac73a4d6766464b38ec6d91eb45ce7457c44'
       WHERE "networkId"= 100 AND symbol='PAN'
      `,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE token
        DROP COLUMN IF EXISTS "mainnetAddress"
    `);
  }
}
