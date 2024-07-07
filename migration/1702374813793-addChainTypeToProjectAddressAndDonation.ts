import { MigrationInterface, QueryRunner } from 'typeorm';

export class addChainTypeToProjectAddressAndDonation1702374813793
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add chainType to projectAddress
    await queryRunner.query(
      `ALTER TABLE "project_address" ADD "chainType" character varying NOT NULL DEFAULT 'EVM'`,
    );
    // Add chainType to donation
    await queryRunner.query(
      `ALTER TABLE "donation" ADD "chainType" character varying NOT NULL DEFAULT 'EVM'`,
    );

    // Add chainType to token
    await queryRunner.query(
      `ALTER TABLE "token" ADD "chainType" character varying NOT NULL DEFAULT 'EVM'`,
    );

    // Update chainType for projectAddress
    await queryRunner.query(`UPDATE "project_address" SET "chainType" = 'EVM'`);
    // Update chainType for donation
    await queryRunner.query(`UPDATE "donation" SET "chainType" = 'EVM'`);
    // Update chainType for token
    await queryRunner.query(`UPDATE "token" SET "chainType" = 'EVM'`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
