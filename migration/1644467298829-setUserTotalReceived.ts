import { MigrationInterface, QueryRunner } from 'typeorm';

export class setUserTotalReceived1644467298829 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // To run the update query SUM I should check table existance
    // UPDATE clause doesn't have a IF EXISTS conditional
    const userTableExists = await queryRunner.hasTable('user');
    const projectTableExists = await queryRunner.hasTable('project');

    if (userTableExists && projectTableExists) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD IF NOT EXISTS "totalReceived" integer DEFAULT 0`,
      );

      await queryRunner.query(`
        UPDATE "user"
        SET "totalReceived" = p."totalProjectReceived"
        FROM (
            SELECT "admin", COALESCE(SUM("totalDonations"),0) AS "totalProjectReceived"
            FROM project
            GROUP BY "admin"
        ) AS p
        WHERE p."admin" = CAST(id AS text)
      `);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // deleting the column from project entity removes it completely.
  }
}
