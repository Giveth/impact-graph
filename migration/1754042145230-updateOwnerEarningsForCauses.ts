import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOwnerEarningsForCauses1754042500001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE project 
      SET 
        "ownerTotalEarned" = COALESCE(cause_totals.total_received, 0),
        "ownerTotalEarnedUsdValue" = COALESCE(cause_totals.total_received_usd, 0)
      FROM (
        SELECT 
          cp."causeId",
          SUM(cp."amountReceived") as total_received,
          SUM(cp."amountReceivedUsdValue") as total_received_usd
        FROM cause_project cp
        GROUP BY cp."causeId"
      ) cause_totals
      WHERE 
        project.id = cause_totals."causeId" 
        AND project."projectType" = 'cause';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE project
      SET 
        "ownerTotalEarned" = 0,
        "ownerTotalEarnedUsdValue" = 0
      WHERE "projectType" = 'cause';
    `);
  }
}
