import { getTimestampInSeconds } from './utils';

const firstGivbackRoundTimeStamp = Number(
  process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
);

// Not used for month-based calculation, kept for backwards compatibility
// const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

/**
 * Get the round number for a given date
 *
 * @description
 * The round number is calculated based on the date. Each month is a new round.
 *
 * @example
 * getRoundNumberByDate(new Date('2026-02-10')) // 1778 // 1st of February 2026 is the 1778th round
 *
 * @param date - The date to get the round number for
 * @returns {
 *   round: number;
 *   fromTimestamp: number;
 *   toTimestamp: number;
 * }
 */
export const getRoundNumberByDate = (
  date: Date,
): {
  round: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  // Calendar month-based calculation for perfect 1st-of-month alignment
  const startDate = new Date(firstGivbackRoundTimeStamp * 1000);
  const currentDate = new Date(date);

  // Calculate months elapsed since start date
  const monthsElapsed =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    (currentDate.getMonth() - startDate.getMonth());

  const round = monthsElapsed + 1;

  // Round boundaries: 1st of current month to 1st of next month
  const roundStartDate = new Date(
    Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0),
  );

  const roundEndDate = new Date(roundStartDate);
  roundEndDate.setUTCMonth(roundEndDate.getUTCMonth() + 1);

  const fromTimestamp = getTimestampInSeconds(roundStartDate);
  const toTimestamp = getTimestampInSeconds(roundEndDate);

  return {
    round,
    fromTimestamp,
    toTimestamp,
  };
};
