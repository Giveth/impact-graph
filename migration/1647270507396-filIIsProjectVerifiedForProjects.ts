import { MigrationInterface, QueryRunner } from 'typeorm';

export class fillIsProjectVerifiedForProjects1647270507396
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // If project of a donation is verfied we set isProjectVerified to true for previous projects
    // But for future donations we set this field in the time of creating donation
    const donationTableExists = await queryRunner.hasTable('donation');
    if (!donationTableExists) {
      return;
    }
    await queryRunner.query(
      `ALTER TABLE donation ADD IF NOT EXISTS "isProjectVerified" boolean DEFAULT false`,
    );
    const donations = await queryRunner.query(`SELECT * FROM donation`);
    for (const donation of donations) {
      const project = (
        await queryRunner.query(`
            SELECT * FROM project
            WHERE id=${donation.projectId}
            LIMIT 1
            `)
      )[0];
      await queryRunner.query(`
            UPDATE donation
            SET "isProjectVerified" =${project.verified}
            WHERE id=${donation.id}
            `);
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
