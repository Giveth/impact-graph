import { MigrationInterface, QueryRunner } from 'typeorm';

// tslint:disable-next-line:class-name
export class percentageBalanceSnapshot1663590304407
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS "power_percentage_snapshot" (
        id SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "projectId" integer NOT NULL,
        "powerSnapshotId" integer NOT NULL,
        percentage numeric(5,2) NOT NULL,
        CONSTRAINT "PK_405a03050a894c2870d49a86e47" PRIMARY KEY (id)
    )
      `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_3d53595c8d181c5eac9423d69b" ON public.power_percentage_snapshot USING btree ("userId" ASC NULLS LAST, "projectId" ASC NULLS LAST, "powerSnapshotId" ASC NULLS LAST)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "power_percentage_snapshot"`);
    await queryRunner.query(`DROP INDEX "IDX_3d53595c8d181c5eac9423d69b"`);
  }
}
