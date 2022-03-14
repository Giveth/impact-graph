import { MigrationInterface, QueryRunner } from 'typeorm';
import { Donation } from '../src/entities/donation';

export class fillIsProjectVerifiedForProjects1647270507396
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    const donationTableExists = await queryRunner.hasTable('donation');
    if (!donationTableExists) {
      return;
    }
    await queryRunner.query(
      `ALTER TABLE donation ADD IF NOT EXISTS "isProjectVerified" boolean`,
    );
    const donations = await Donation.find({});
    for (const donation of donations) {
      donation.isProjectVerified = donation.project.verified;
      await donation.save();
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
             ALTER TABLE donation
             DROP COLUMN "isProjectVerified"
             `,
    );
  }
}
