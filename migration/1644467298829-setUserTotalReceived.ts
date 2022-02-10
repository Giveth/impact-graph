import { MigrationInterface, QueryRunner } from 'typeorm';

export class setUserTotalReceived1644467298829 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "user" ADD "totalReceived" integer DEFAULT 0`,
    );

    await queryRunner.query(`
      UPDATE "user"
      SET "totalReceived" = p."totalProjectReceived"
      FROM (
        SELECT "admin", SUM("totalDonations") AS "totalProjectReceived"
        FROM project
        GROUP BY "admin"
      ) AS p
      WHERE p."admin" = CAST(id AS text)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // deleting the column from project entity removes it completely.
  }
}
