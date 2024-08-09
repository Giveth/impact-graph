import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGivingBlocksProjects1719740998424
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete project addresses
    await queryRunner.query(`
            DELETE FROM "project_address"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete reactions
    await queryRunner.query(`
            DELETE FROM "reaction"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete project updates
    await queryRunner.query(`
            DELETE FROM "project_update"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete power boostings
    await queryRunner.query(`
            DELETE FROM "power_boosting"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete previous_round_rank
    await queryRunner.query(`
            DELETE FROM "previous_round_rank"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete project_status_history
    await queryRunner.query(`
            DELETE FROM "project_status_history"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete purple_address
    await queryRunner.query(`
            DELETE FROM "purple_address"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Delete project_verification_form
    await queryRunner.query(`
            DELETE FROM "project_verification_form"
            WHERE "projectId" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);

    // Finally, delete the projects
    await queryRunner.query(`
            DELETE FROM "project"
            WHERE "id" IN (
                SELECT "project"."id"
                FROM "project"
                LEFT JOIN "organization" ON "project"."organizationId" = "organization"."id"
                WHERE "organization"."label" = 'givingBlock' AND "project"."totalDonations" = 0
            );
        `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // In this case, it's not possible to fully revert the data deletions
    // So we leave the down method empty
  }
}
