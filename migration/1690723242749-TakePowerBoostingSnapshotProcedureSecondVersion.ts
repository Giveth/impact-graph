import { MigrationInterface, QueryRunner } from 'typeorm';

export class TakePowerBoostingSnapshotProcedureSecondVersion1690723242749
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Copy both power_snapshot and fill power_boosting_snapshot
    await queryRunner.query(`
        CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_BOOSTING_SNAPSHOT"() LANGUAGE 'sql' AS $BODY$
            WITH snapshot_entity as (insert into "power_snapshot" ("time") values (NOW()) returning id),

            boosting_insert as (insert into "power_boosting_snapshot" ("userId", "projectId", "percentage", "powerSnapshotId")
            select "power_boosting"."userId", "power_boosting"."projectId", "power_boosting"."percentage", snapshot_entity.id
            from snapshot_entity, "power_boosting"
            left join project on project.id = power_boosting."projectId"
            where verified=true returning "userId")

            insert into "power_balance_snapshot" ("userId", "balance", "powerSnapshotId")
            select DISTINCT ("boosting_insert"."userId"), NULL ::double precision, snapshot_entity.id
            from "boosting_insert", snapshot_entity
            $BODY$;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the previous version of the procedure
    await queryRunner.query(
      `CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_BOOSTING_SNAPSHOT"() LANGUAGE 'sql' AS $BODY$
            WITH snapshot_entity as (insert into "power_snapshot" ("time") values (NOW()) returning id)
            insert into "power_boosting_snapshot" ("userId", "projectId", "percentage", "powerSnapshotId")
            select "power_boosting"."userId", "power_boosting"."projectId", "power_boosting"."percentage", snapshot_entity.id
            from snapshot_entity, "power_boosting"
            left join project on project.id = power_boosting."projectId"
            where verified=true
            $BODY$;`,
    );
  }
}
