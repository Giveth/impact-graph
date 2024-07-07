import { MigrationInterface, QueryRunner } from 'typeorm';

export class modifyUserTotalReceived1647455993813
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // To run the update query SUM I should check table existance
    // UPDATE clause doesn't have a IF EXISTS conditional
    const userTableExists = await queryRunner.hasTable('user');

    if (userTableExists) {
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "totalReceived" TYPE real`,
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

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
