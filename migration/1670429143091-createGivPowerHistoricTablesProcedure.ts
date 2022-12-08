import { MigrationInterface, QueryRunner } from 'typeorm';

export class createGivPowerHistoricTablesProcedure1670429143091
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // power boosting, power balance and power snapshots's historic procedures
    await queryRunner.query(`
      CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_GIV_POWER_SNAPSHOTS_HISTORY"()
      LANGUAGE 'sql'
      AS $BODY$
        WITH
        power_boosting_entity AS (
          DELETE FROM "power_boosting_snapshot" AS pbs
          WHERE pbs."powerSnapshotId" IN (
              SELECT "snapshot"."id"
              FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
              WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
          )
          RETURNING pbs."id", pbs."userId", pbs."projectId", pbs."powerSnapshotId", pbs."percentage"
        ),
        power_balance_entity AS (
          DELETE FROM "power_balance_snapshot" AS pbs
          WHERE pbs."powerSnapshotId" IN (
              SELECT "snapshot"."id"
              FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
              WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
          )
          RETURNING pbs."id", pbs."userId", pbs."balance", pbs."powerSnapshotId"
        ),
        power_entity AS (
          DELETE FROM "power_snapshot" AS ps
          WHERE ps."id" IN (
              SELECT "snapshot"."id"
              FROM "power_snapshot" AS "snapshot", "power_round" AS "powerRound"
              WHERE "snapshot"."roundNumber" < "powerRound"."round" - 3
          )
          RETURNING ps."id", ps."time", ps."blockNumber", ps."roundNumber", ps."synced"
        ),
        power_boosting_entity_history AS (
          INSERT INTO "power_boosting_snapshot_history"
          SELECT *
          FROM "power_boosting_entity"
          RETURNING *
        ),
        power_balance_entity_history AS (
          INSERT INTO "power_balance_snapshot_history"
          SELECT *
          FROM "power_balance_entity"
          RETURNING *
        )
        INSERT INTO "power_snapshot_history"
        SELECT *
        FROM "power_entity"
      $BODY$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS public."TAKE_GIV_POWER_SNAPSHOTS_HISTORY"();`,
    );
  }
}
