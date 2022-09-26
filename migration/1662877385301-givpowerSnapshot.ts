import { MigrationInterface, QueryRunner } from 'typeorm';

export class GivpowerSnapshot1663588664793 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS "power_snapshot" (
      id SERIAL NOT NULL,
      "time" timestamp without time zone NOT NULL,
      "blockNumber" integer,
      "roundNumber" integer,
      CONSTRAINT "PK_82b9df53a07ea29b89823ff857b" PRIMARY KEY (id)
    )`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_16c99a87519adaf6b86acfb7cf" ON public.power_snapshot USING btree ("time" ASC NULLS LAST)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9a74286ec73897fbec0f595f95" ON public.power_snapshot USING btree ("blockNumber" ASC NULLS LAST)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "power_snapshot"`);
    await queryRunner.query(`DROP INDEX "IDX_16c99a87519adaf6b86acfb7cf"`);
    await queryRunner.query(`DROP INDEX "IDX_9a74286ec73897fbec0f595f95"`);
  }
}
