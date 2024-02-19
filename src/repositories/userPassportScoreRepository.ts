import { UserPassportScore } from '../entities/userPassportScore';
import { AppDataSource } from '../orm';
import moment from 'moment';

export const findPassportScoreByUserIdAndQfRoundId = async (params: {
  userId: number;
  qfRoundId: number;
}): Promise<UserPassportScore | null> => {
  const { userId, qfRoundId } = params;
  return UserPassportScore.createQueryBuilder()
    .where(`userId = :userId`, { userId })
    .andWhere(`qfRoundI = :qfRoundI`, { qfRoundId })
    .getOne();
};

export const insertNewUserPassportScore = async (params: {
  userId: number;
  qfRoundId: number;
  passportScore: number;
  passportStamps: number;
}): Promise<UserPassportScore> => {
  const userPassportScore = new UserPassportScore();
  userPassportScore.userId = params.userId;
  userPassportScore.qfRoundId = params.qfRoundId;
  userPassportScore.passportScore = params.passportScore;
  userPassportScore.passportStamps = params.passportStamps;
  return userPassportScore.save();
};

export async function fetchUsersAndRoundsNeedingPassportScore(
  startTimestampInSeconds?: number,
) {
  // const DEFAULT_START_DATE = '2023-12-01 00:00:00';
  // const startDate = startTimestampInSeconds
  //   ? moment.unix(startTimestampInSeconds).format('YYYY-MM-DD 00:00:00')
  //   : DEFAULT_START_DATE;

  const query = `
    SELECT d."userId", d."qfRoundId"
    FROM donation d
    JOIN qf_round qfr ON d."qfRoundId" = qfr.id
    LEFT JOIN user_passport_score ups ON d."userId" = ups."userId" AND d."qfRoundId" = ups."qfRoundId"
    WHERE qfr."endDate" < CURRENT_DATE
      AND ups.id IS NULL;
  `;

  return AppDataSource.getDataSource().query(query);
}
