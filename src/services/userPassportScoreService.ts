import { UserPassportScore } from '../entities/userPassportScore';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { findUserById } from '../repositories/userRepository';
import { errorMessages } from '../utils/errorMessages';
import {
  findPassportScoreByUserIdAndQfRoundId,
  insertNewUserPassportScore,
} from '../repositories/userPassportScoreRepository';

export const addNewUserPassportScoreWithGitcoinData = async (params: {
  userId: number;
  qfRoundId: number;
}): Promise<UserPassportScore | null> => {
  const { userId, qfRoundId } = params;
  const user = await findUserById(userId);
  if (!user) throw new Error(errorMessages.USER_NOT_FOUND);
  const userPassportScore = await findPassportScoreByUserIdAndQfRoundId({
    userId,
    qfRoundId,
  });
  if (userPassportScore) return userPassportScore;
  const passportScore = await getGitcoinAdapter().submitPassport({
    address: user.walletAddress as string,
  });
  const passportStamps = await getGitcoinAdapter().getPassportStamps(
    user.walletAddress as string,
  );

  if (passportScore && passportScore?.score) {
    return insertNewUserPassportScore({
      userId,
      qfRoundId,
      passportScore: Number(passportScore.score),
      passportStamps: passportStamps.items.length,
    });
  }
  return null;
};
