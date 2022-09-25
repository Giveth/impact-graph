import { getTimestampInSeconds } from './utils';

export const getRoundNumberByDate = (
  date: Date,
): {
  previousGivbackRound: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  const firstGivbackRoundTimeStamp = Number(
    process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
  );
  const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

  const now = getTimestampInSeconds(date);

  // use math.ceil because rounds starts from 1 not zero
  const previousGivbackRound = Math.ceil(
    (now - firstGivbackRoundTimeStamp) / givbackRoundLength,
  );

  const fromTimestamp =
    (previousGivbackRound - 1) * givbackRoundLength +
    firstGivbackRoundTimeStamp;
  const toTimestamp =
    previousGivbackRound * givbackRoundLength + firstGivbackRoundTimeStamp;
  return {
    previousGivbackRound,
    fromTimestamp,
    toTimestamp,
  };
};
