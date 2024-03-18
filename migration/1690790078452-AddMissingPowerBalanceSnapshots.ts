import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPowerBalanceSnapshots1690790078452
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing power_balance_snapshot
    await queryRunner.query(`
        insert into "power_balance_snapshot" ("userId", "balance", "powerSnapshotId")
            select DISTINCT (power_boosting_snapshot."userId"), NULL ::double precision, power_boosting_snapshot."powerSnapshotId"
            from public.power_boosting_snapshot
            on conflict do nothing;
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
