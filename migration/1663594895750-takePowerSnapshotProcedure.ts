import { MigrationInterface, QueryRunner } from 'typeorm';

// tslint:disable-next-line:class-name
export class TakePowerBoostingSnapshotProcedure1663594895750
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE OR REPLACE PROCEDURE PUBLIC."TAKE_POWER_BOOSTING_SNAPSHOT"() LANGUAGE 'sql' AS $BODY$
            WITH snapshot_entity as (insert into "power_snapshot" ("time") values (NOW()) returning id)
            insert into "power_boosting_snapshot" ("userId", "projectId", "percentage", "powerSnapshotId")
            select "power_boosting"."userId", "power_boosting"."projectId", "power_boosting"."percentage", snapshot_entity.id
            from snapshot_entity, "power_boosting"
            $BODY$;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS public."TAKE_POWER_SNAPSHOT"();`,
    );
  }
}
