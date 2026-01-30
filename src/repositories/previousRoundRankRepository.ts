import { PowerSnapshot } from '../entities/powerSnapshot';
import { PreviousRoundRank } from '../entities/previousRoundRank';
import { AppDataSource } from '../orm';

export const deleteAllPreviousRoundRanks = async () => {
  return PreviousRoundRank.query(
    `
        DELETE FROM previous_round_rank
      `,
  );
};

export const copyProjectRanksToPreviousRoundRankTable = async () => {
  // Use a transaction to prevent deadlocks
  const queryRunner = AppDataSource.getDataSource().createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Delete and insert in a single transaction to prevent deadlocks
    await queryRunner.query(`
      DELETE FROM previous_round_rank
    `);

    await queryRunner.query(`
      INSERT INTO previous_round_rank ("projectId", round, rank)
      SELECT DISTINCT project_power_view."projectId", project_power_view.round, project_power_view."powerRank"
      FROM project_power_view
      ON CONFLICT (round, "projectId") DO UPDATE SET
        rank = EXCLUDED.rank,
        "updatedAt" = NOW()
    `);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export const projectsThatTheirRanksHaveChanged = async (): Promise<
  {
    projectId: number;
    newRank: number;
    oldRank: number;
    round: number;
  }[]
> => {
  const result = await PowerSnapshot.query(
    `
      SELECT
          project_power_view."projectId",
          project_power_view.round,
          project_power_view."powerRank" as "newRank",
          previous_round_rank.rank as "oldRank"
      FROM project_power_view
      INNER JOIN previous_round_rank ON previous_round_rank."projectId" = project_power_view."projectId"
      INNER JOIN project ON project_power_view."projectId" = project.id
      WHERE project_power_view."powerRank" != previous_round_rank.rank
      AND project.verified = true;
      `,
  );
  return result.map(item => {
    return {
      projectId: Number(item.projectId),
      newRank: Number(item.newRank),
      oldRank: Number(item.oldRank),
      round: Number(item.round),
    };
  });
};
