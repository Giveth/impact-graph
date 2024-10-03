import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateIsGivbackEligibleForVerifiedProjects1637168932305
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update isGivbackEligible to true for verified projects
    await queryRunner.query(`
            UPDATE project
            SET "isGivbackEligible" = true
            WHERE "verified" = true;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the update (optional)
    await queryRunner.query(`
            UPDATE project
            SET "isGivbackEligible" = false
            WHERE "verified" = true;
        `);
  }
}
