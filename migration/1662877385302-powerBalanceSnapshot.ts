import { MigrationInterface, QueryRunner } from 'typeorm';

export class powerBalanceSnapshot1662877385302 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "power_balance_snapshot" (
            id SERIAL NOT NULL,
            "userId" integer NOT NULL,
            "powerSnapshotId" integer NOT NULL,
            balance double precision NOT NULL,
            CONSTRAINT "PK_05a9a0c05ed4c805c503e2003db" PRIMARY KEY (id)
        )
        `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_566e8fceaa4b72a51be2d43526" ON public.power_balance_snapshot USING btree ("userId" ASC NULLS LAST, "powerSnapshotId" ASC NULLS LAST)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "power_balance_snapshot"`);
    await queryRunner.query(`DROP INDEX "IDX_566e8fceaa4b72a51be2d43526"`);
  }
}
