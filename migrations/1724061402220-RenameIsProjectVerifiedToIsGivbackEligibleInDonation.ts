import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameIsProjectVerifiedToIsGivbackEligibleInDonation1637168932306
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            RENAME COLUMN "isProjectVerified" TO "isProjectGivbackEligible";
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE donation
            RENAME COLUMN "isProjectGivbackEligible" TO "isProjectVerified";
        `);
  }
}
