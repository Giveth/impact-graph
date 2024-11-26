import { FindOneOptions } from 'typeorm';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { ProjectUserRecord } from '../entities/projectUserRecord';
import { User } from '../entities/user';
import { QfRound } from '../entities/qfRound';
import { findActiveEarlyAccessRound } from '../repositories/earlyAccessRoundRepository';
import { updateOrCreateProjectRoundRecord } from '../repositories/projectRoundRecordRepository';
import { updateOrCreateProjectUserRecord } from '../repositories/projectUserRecordRepository';
import { findActiveQfRound } from '../repositories/qfRoundRepository';
import { updateUserGitcoinScore } from './userService';
import {
  GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS,
  GITCOIN_PASSPORT_MIN_VALID_SCORE,
  MAX_CONTRIBUTION_WITH_GITCOIN_PASSPORT_ONLY,
} from '../constants/qacc';

const getEaProjectRoundRecord = async ({
  projectId,
  eaRoundId,
}: {
  projectId: number;
  eaRoundId: number;
}): Promise<ProjectRoundRecord> => {
  let projectRoundRecord = await ProjectRoundRecord.findOneBy({
    projectId,
    earlyAccessRoundId: eaRoundId,
  });

  if (!projectRoundRecord) {
    await updateOrCreateProjectRoundRecord(projectId, undefined, eaRoundId);
    projectRoundRecord = await ProjectRoundRecord.findOneBy({
      projectId,
      earlyAccessRoundId: eaRoundId,
    });
  }

  return projectRoundRecord!;
};

const getQfProjectRoundRecord = async ({
  projectId,
  qfRoundId,
}: {
  projectId: number;
  qfRoundId: number;
}): Promise<ProjectRoundRecord | null> => {
  const condition: FindOneOptions<ProjectRoundRecord> = {
    where: {
      projectId,
      qfRoundId: qfRoundId,
    },
    select: [
      'id',
      'totalDonationAmount',
      'cumulativePastRoundsDonationAmounts',
    ],
    loadEagerRelations: false,
  };
  let projectRoundRecord = await ProjectRoundRecord.findOne(condition);

  if (!projectRoundRecord) {
    await updateOrCreateProjectRoundRecord(projectId, qfRoundId);
    projectRoundRecord = await ProjectRoundRecord.findOne(condition);
  }

  return projectRoundRecord;
};

const getUserProjectRecord = async ({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<ProjectUserRecord> => {
  const findCondition: FindOneOptions<ProjectUserRecord> = {
    where: {
      projectId,
      userId,
    },
    select: [
      'id',
      'totalDonationAmount',
      'eaTotalDonationAmount',
      'qfTotalDonationAmount',
    ],
    loadEagerRelations: false,
  };
  let projectUserRecord = await ProjectUserRecord.findOne(findCondition);

  if (!projectUserRecord) {
    await updateOrCreateProjectUserRecord({ projectId, userId });
    projectUserRecord = await ProjectUserRecord.findOne(findCondition);
  }

  return projectUserRecord!;
};

const getQAccDonationCap = async ({
  projectId,
  userId,
  donateTime,
}: {
  projectId: number;
  userId: number;
  donateTime?: Date;
}): Promise<number> => {
  donateTime = donateTime || new Date();

  let activeRound: EarlyAccessRound | QfRound | null = null;
  const activeEarlyAccessRound = await findActiveEarlyAccessRound(donateTime);
  let activeQfRound: QfRound | null | undefined;
  const isEarlyAccess = !!activeEarlyAccessRound;

  if (isEarlyAccess) {
    activeRound = activeEarlyAccessRound;
  } else {
    activeQfRound = await findActiveQfRound({
      date: donateTime,
    });
    if (
      donateTime &&
      activeQfRound &&
      activeQfRound.beginDate <= donateTime &&
      donateTime <= activeQfRound.endDate
    ) {
      activeRound = activeQfRound;
    }
  }

  if (!activeRound) {
    return 0;
  }

  const cumulativeUSDCapPerProject =
    activeRound.cumulativeUSDCapPerProject || 0;
  const cumulativeUSDCapPerUserPerProject =
    activeRound.cumulativeUSDCapPerUserPerProject || 0;
  const tokenPrice = activeRound.tokenPrice || Number.MAX_SAFE_INTEGER;

  const projectPolRoundCap = cumulativeUSDCapPerProject / tokenPrice;
  const userPolRoundCap = cumulativeUSDCapPerUserPerProject / tokenPrice;

  if (isEarlyAccess) {
    const projectRecord = await getEaProjectRoundRecord({
      projectId,
      eaRoundId: activeRound.id,
    });

    if (projectRecord.totalDonationAmount > projectPolRoundCap) {
      // Project has reached its cap
      return 0;
    }

    const userRecord = await getUserProjectRecord({
      projectId,
      userId,
    });

    return Math.max(
      0,
      Math.min(
        projectPolRoundCap -
          projectRecord.totalDonationAmount -
          (projectRecord.cumulativePastRoundsDonationAmounts || 0), // project unused cap
        userPolRoundCap - userRecord.totalDonationAmount, // user unused cap
      ),
    );
  } else {
    // QF Round
    const projectRecord = await getQfProjectRoundRecord({
      projectId,
      qfRoundId: activeRound.id,
    });

    const userRecord = await getUserProjectRecord({
      projectId,
      userId,
    });

    const projectCloseCap =
      (activeQfRound?.roundUSDCloseCapPerProject || 0) / tokenPrice;

    const totalCollected =
      (projectRecord?.totalDonationAmount || 0) +
      (projectRecord?.cumulativePastRoundsDonationAmounts || 0);

    const projectCap = Math.max(
      // Capacity to fill qf round cap
      projectPolRoundCap - totalCollected,
      // Capacity over the qr found cap per project
      Math.min(
        250 / tokenPrice, // 250 USD between qf round cap and qf round close
        projectCloseCap - totalCollected, // project close cap
      ),
    );

    const anyUserCall = Math.min(projectCap, userPolRoundCap);

    return Math.max(0, anyUserCall - userRecord.qfTotalDonationAmount);
  }
};

const validDonationAmountBasedOnKYCAndScore = async ({
  projectId,
  user,
  amount,
}: {
  projectId: number;
  user: User;
  amount: number;
}): Promise<boolean> => {
  if (user.privadoVerified) {
    return true;
  }
  if (
    !user.passportScore ||
    !user.passportScoreUpdateTimestamp ||
    user.passportScoreUpdateTimestamp.getTime() >
      Date.now() - GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS
  ) {
    await updateUserGitcoinScore(user);
  }
  if (
    !user.passportScore ||
    user.passportScore < GITCOIN_PASSPORT_MIN_VALID_SCORE
  ) {
    throw new Error(
      `passport score is less than ${GITCOIN_PASSPORT_MIN_VALID_SCORE}`,
    );
  }
  const userRecord = await getUserProjectRecord({
    projectId,
    userId: user.id,
  });
  const qfTotalDonationAmount = userRecord.qfTotalDonationAmount;
  const remainedCap =
    MAX_CONTRIBUTION_WITH_GITCOIN_PASSPORT_ONLY - qfTotalDonationAmount;
  if (amount > remainedCap) {
    throw new Error('amount is more than allowed cap with gitcoin score');
  }
  return true;
};

export default {
  getQAccDonationCap,
  validDonationAmountBasedOnKYCAndScore,
};
