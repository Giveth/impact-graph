import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateCauseEarningsToUser1754043200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user"
      SET 
        "causesTotalEarned" = COALESCE(cause_totals.total_earned, 0),
        "causesTotalEarnedUsdValue" = COALESCE(cause_totals.total_earned_usd, 0)
      FROM (
        SELECT 
          p."adminUserId" AS user_id,
          SUM(p."ownerTotalEarned") AS total_earned,
          SUM(p."ownerTotalEarnedUsdValue") AS total_earned_usd
        FROM project p
        WHERE p."projectType" = 'cause'
        GROUP BY p."adminUserId"
      ) AS cause_totals
      WHERE "user"."id" = cause_totals.user_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user"
      SET 
        "causesTotalEarned" = 0,
        "causesTotalEarnedUsdValue" = 0;
    `);
  }
}
