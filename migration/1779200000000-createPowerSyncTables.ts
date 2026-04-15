import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePowerSyncTables1779200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "power_sync_outbox_event" (
        "id" SERIAL NOT NULL,
        "sourceSystem" character varying NOT NULL DEFAULT 'impact-graph',
        "eventType" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "userId" integer NOT NULL,
        "sourceUpdatedAt" TIMESTAMP NOT NULL,
        "payload" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_power_sync_outbox_event" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_power_sync_outbox_event_user_id_id"
      ON "power_sync_outbox_event" ("userId", "id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_power_sync_outbox_event_source_event_user_id_id"
      ON "power_sync_outbox_event" ("sourceSystem", "eventType", "userId", "id")
    `);

    await queryRunner.query(`
      CREATE TABLE "power_sync_cursor" (
        "id" SERIAL NOT NULL,
        "sourceSystem" character varying NOT NULL,
        "lastEventId" integer NOT NULL DEFAULT 0,
        "lastSourceUpdatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_power_sync_cursor_source_system" UNIQUE ("sourceSystem"),
        CONSTRAINT "PK_power_sync_cursor" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "power_sync_cursor"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_power_sync_outbox_event_source_event_user_id_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_power_sync_outbox_event_user_id_id"`,
    );
    await queryRunner.query(`DROP TABLE "power_sync_outbox_event"`);
  }
}
