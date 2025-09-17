import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlobalConfigurationTable1777623930819
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "global_configuration" (
        "id" SERIAL NOT NULL,
        "key" character varying NOT NULL,
        "value" character varying,
        "description" character varying,
        "type" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_global_configuration_key" UNIQUE ("key"),
        CONSTRAINT "PK_global_configuration" PRIMARY KEY ("id")
      )
    `);

    // Insert default global configuration values
    await queryRunner.query(`
      INSERT INTO "global_configuration" ("key", "value", "description", "type", "isActive") VALUES
      ('GLOBAL_MINIMUM_PASSPORT_SCORE', '0.0', 'Global minimum passport score required for all QF rounds', 'number', true),
      ('GLOBAL_MINIMUM_MBD_SCORE', '0.0', 'Global minimum MBD score required for all QF rounds', 'number', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "global_configuration"`);
  }
}
