import { MigrationInterface, QueryRunner } from 'typeorm';

export class setUserTotalDonated1644467038020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "user" ADD "totalDonated" integer DEFAULT 0`,
    );

    await queryRunner.query(`
      UPDATE "user"
      SET "totalDonated" = d."totalDonationsDonated"
      FROM (
        SELECT "userId", SUM("valueUsd") AS "totalDonationsDonated"
        FROM donation
        GROUP BY "userId"
      ) AS d
      WHERE d."userId" = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // deleting the column from project entity removes it completely.
  }
}
