import { Brackets, FindOneOptions } from 'typeorm';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { ProjectUserRecord } from '../entities/projectUserRecord';
import { User } from '../entities/user';
import { QfRound } from '../entities/qfRound';
import { findActiveEarlyAccessRound } from '../repositories/earlyAccessRoundRepository';
import { updateOrCreateProjectRoundRecord } from '../repositories/projectRoundRecordRepository';
import { updateOrCreateProjectUserRecord } from '../repositories/projectUserRecordRepository';
import { findActiveQfRound } from '../repositories/qfRoundRepository';
import { updateUserGitcoinScores } from './userService';
import {
  GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS,
  GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
  GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
} from '../constants/gitcoin';
import { Donation, DONATION_STATUS } from '../entities/donation';

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

  const cumulativePOLCapPerProject =
    activeRound.cumulativePOLCapPerProject || 0;
  const cumulativePOLCapPerUserPerProject =
    activeRound.cumulativePOLCapPerUserPerProject || 0;

  if (isEarlyAccess) {
    const projectRecord = await getEaProjectRoundRecord({
      projectId,
      eaRoundId: activeRound.id,
    });

    if (projectRecord.totalDonationAmount > cumulativePOLCapPerProject) {
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
        cumulativePOLCapPerProject -
          projectRecord.totalDonationAmount -
          (projectRecord.cumulativePastRoundsDonationAmounts || 0), // project unused cap
        cumulativePOLCapPerUserPerProject - userRecord.totalDonationAmount, // user unused cap
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

    const projectCloseCap = activeQfRound?.roundPOLCloseCapPerProject || 0;

    const totalCollected =
      (projectRecord?.totalDonationAmount || 0) +
      (projectRecord?.cumulativePastRoundsDonationAmounts || 0);

    const projectCap = Math.max(
      // Capacity to fill qf round cap
      cumulativePOLCapPerProject - totalCollected,
      // Capacity over the qf round cap per project
      Math.min(
        250, // 250 POL between qf round cap and qf round close
        projectCloseCap - totalCollected, // project close cap
      ),
    );

    const anyUserCap = Math.min(projectCap, cumulativePOLCapPerUserPerProject);

    return Math.max(0, anyUserCap - userRecord.qfTotalDonationAmount);
  }
};

const getUserRemainedCapBasedOnGitcoinScore = async ({
  projectId,
  user,
}: {
  projectId: number;
  user: User;
}): Promise<number> => {
  if (
    user.passportScore === null ||
    user.analysisScore === null ||
    !user.passportScoreUpdateTimestamp ||
    user.passportScoreUpdateTimestamp.getTime() <
      Date.now() - GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS
  ) {
    await updateUserGitcoinScores(user);
  }
  if (
    !user.hasEnoughGitcoinAnalysisScore &&
    !user.hasEnoughGitcoinPassportScore
  ) {
    throw new Error(
      `analysis score is less than ${GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE}
       and passport score is less than ${GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE}`,
    );
  }
  const userRecord = await getUserProjectRecord({
    projectId,
    userId: user.id,
  });
  const activeQfRound = await findActiveQfRound();
  const qfTotalDonationAmount = userRecord.qfTotalDonationAmount;
  if (!activeQfRound?.roundPOLCapPerUserPerProjectWithGitcoinScoreOnly) {
    throw new Error(
      'active qf round does not have round POLCapPerUserPerProjectWithGitcoinScoreOnly!',
    );
  }
  return (
    activeQfRound.roundPOLCapPerUserPerProjectWithGitcoinScoreOnly -
    qfTotalDonationAmount
  );
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
  const remainedCap = await getUserRemainedCapBasedOnGitcoinScore({
    projectId,
    user,
  });
  if (amount > remainedCap) {
    throw new Error('amount is more than allowed cap with gitcoin score');
  }
  return true;
};

const getQAccStat = async (): Promise<{
  totalCollected: number;
  qfTotalCollected: number;
  totalContributors: number;
}> => {
  const [qfTotalCollected, totalCollected] = await Promise.all([
    Donation.createQueryBuilder('donation')
      .select('COALESCE(sum(donation.amount), 0)', 'total_qf_collected')
      .where('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      })
      .andWhere('donation."qfRoundId" IS NOT NULL')
      .cache('qf_total_collected_donation', 1000)
      .getRawOne(),

    Donation.createQueryBuilder('donation')
      .select('COALESCE(sum(donation.amount), 0)', 'total_collected')
      .addSelect('count(distinct donation."userId")', 'total_contributors')
      .where('donation.status = :status', {
        status: DONATION_STATUS.VERIFIED,
      })
      .andWhere(
        new Brackets(qb => {
          qb.orWhere('donation."qfRoundId" IS NOT NULL').orWhere(
            'donation."earlyAccessRoundId" IS NOT NULL',
          );
        }),
      )
      .cache('total_collected_donation', 1000)
      .getRawOne(),
  ]);

  return {
    totalCollected: totalCollected.total_collected,
    qfTotalCollected: qfTotalCollected.total_qf_collected,
    totalContributors: totalCollected.total_contributors,
  };
};

export default {
  getQAccDonationCap,
  validDonationAmountBasedOnKYCAndScore,
  getUserRemainedCapBasedOnGitcoinScore,
  getQAccStat,
};
