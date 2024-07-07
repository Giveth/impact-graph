import { MigrationInterface, QueryRunner } from 'typeorm';

export class setUserTotalDonated1644467038020 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // To run the update query SUM I should check table existance
    // UPDATE clause doesn't have a IF EXISTS conditional
    const userTableExists = await queryRunner.hasTable('user');

    if (userTableExists) {
      await queryRunner.query(
        `ALTER TABLE "user" ADD IF NOT EXISTS "totalDonated" integer DEFAULT 0`,
      );

      await queryRunner.query(`
        UPDATE "user"
        SET "totalDonated" = d."totalDonationsDonated"
        FROM (
            SELECT "userId", COALESCE(SUM("valueUsd"),0) AS "totalDonationsDonated"
            FROM donation
            GROUP BY "userId"
        ) AS d
        WHERE d."userId" = id
      `);
    }
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // deleting the column from project entity removes it completely.
  }
}
