import { PowerSnapshot } from '../entities/powerSnapshot';
import { PreviousRoundRank } from '../entities/previousRoundRank';

export const deleteAllPreviousRoundRanks = async () => {
  return PreviousRoundRank.query(
    `
        DELETE FROM previous_round_rank
      `,
  );
};

export const copyProjectRanksToPreviousRoundRankTable = async () => {
  await deleteAllPreviousRoundRanks();
  return PreviousRoundRank.query(
    `
           INSERT INTO previous_round_rank ("projectId", round, rank)
           SELECT project_power_view."projectId", project_power_view.round, project_power_view."powerRank"
           FROM project_power_view;
      `,
  );
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
