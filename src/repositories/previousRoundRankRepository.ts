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
  return PreviousRoundRank.query(
    `
           INSERT INTO previous_round_rank ("projectId", round, rank)
           SELECT project_power_view."projectId", project_power_view.round, project_power_view."powerRank"
           FROM project_power_view;
      `,
  );
};
