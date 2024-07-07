import { MigrationInterface, QueryRunner } from 'typeorm';

export class PowerBalanceSnapshotBalanceNullable1690716071288
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // make balance column nullable
    await queryRunner.query(
      `ALTER TABLE "power_balance_snapshot" ALTER COLUMN "balance" DROP NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ff95d730a777d62ab470e1850c"
                ON public.power_balance_snapshot USING btree
                ("powerSnapshotId" ASC NULLS LAST, "userId" ASC NULLS LAST)
                TABLESPACE pg_default
                WHERE balance IS NULL;`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
