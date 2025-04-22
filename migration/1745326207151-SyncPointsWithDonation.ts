import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncPointsWithDonationMigration1745326207151
  implements MigrationInterface
{
  name = 'SyncPointsWithDonationMigration1745326207151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Reset qacc_points_history and user qacc points
    await queryRunner.query(
      `UPDATE qacc_points_history SET "pointsEarned" = 0`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "qaccPoints" = 0, "projectsFundedCount" = 0, "qaccPointsMultiplier" = 1`,
    );

    // Step 2: Get verified donations ordered by createdAt
    const donations = await queryRunner.query(`
      SELECT id, "userId", "projectId", "amount", "createdAt"
      FROM donation
      WHERE status = 'verified'
      ORDER BY "createdAt" ASC
    `);

    // Step 3: Keep track of which user funded which project
    const userProjects = new Set<string>();

    // Step 4: Get total number of projects for max multiplier threshold
    const result = await queryRunner.query(`SELECT COUNT(*) FROM project`);
    const totalProjects = parseInt(result[0].count, 10);

    for (const donation of donations) {
      const key = `${donation.userId}-${donation.projectId}`;

      // If user hasn't donated to this project yet, update the tracker
      if (!userProjects.has(key)) {
        userProjects.add(key);

        await queryRunner.query(
          `UPDATE "user" SET "projectsFundedCount" = "projectsFundedCount" + 1 WHERE id = $1`,
          [donation.userId],
        );
      }

      const user = await queryRunner.query(
        `SELECT "projectsFundedCount", "qaccPointsMultiplier" FROM "user" WHERE id = $1`,
        [donation.userId],
      );
      const projectCount = user[0].projectsFundedCount;
      const currentMultiplier =
        projectCount >= totalProjects
          ? 5
          : projectCount >= 10
            ? 3
            : projectCount >= 5
              ? 2
              : 1;

      if (currentMultiplier !== user[0].qaccPointsMultiplier) {
        await queryRunner.query(
          `UPDATE "user" SET "qaccPointsMultiplier" = $1 WHERE id = $2`,
          [currentMultiplier, donation.userId],
        );
      }

      const pointsEarned = donation.amount * currentMultiplier;

      const updated = await queryRunner.query(
        `UPDATE qacc_points_history
         SET "pointsEarned" = $1
         WHERE "donationId" = $2
         RETURNING id`,
        [pointsEarned, donation.id],
      );

      if (updated.length === 0) {
        await queryRunner.query(
          `INSERT INTO qacc_points_history ("userId", "donationId", "pointsEarned")
           VALUES ($1, $2, $3)`,
          [donation.userId, donation.id, pointsEarned],
        );
      }

      await queryRunner.query(
        `UPDATE "user" SET "qaccPoints" = "qaccPoints" + $1 WHERE id = $2`,
        [pointsEarned, donation.userId],
      );
    }
  }

  public async down(): Promise<void> {}
}
