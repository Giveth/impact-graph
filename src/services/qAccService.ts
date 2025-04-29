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
// import { Project } from '../entities/project';

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

const getUserProjectSeasonRecord = async ({
  projectId,
  userId,
  seasonNumber,
}: {
  projectId: number;
  userId: number;
  seasonNumber?: number;
}): Promise<ProjectUserRecord | null> => {
  const findCondition: FindOneOptions<ProjectUserRecord> = {
    where: {
      projectId,
      userId,
      seasonNumber,
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
    await updateOrCreateProjectUserRecord({ projectId, userId, seasonNumber });
    projectUserRecord = await ProjectUserRecord.findOne(findCondition);
  }

  return projectUserRecord;
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
    // todo: if we need to having some project in early access round, we need to check this
    // Check if project is in the active early access round
    // const project = await Project.findOne({
    //   where: { id: projectId },
    //   relations: ['earlyAccessRounds'],
    // });
    // if (
    //   !project?.earlyAccessRounds?.some(round => round.id === activeRound?.id)
    // ) {
    //   return 0; // Project is not in this early access round
    // }
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
      // todo: if we need to having some project in qf round, we need to check this
      // Check if project is in the active QF round
      // const project = await Project.findOne({
      //   where: { id: projectId },
      //   relations: ['qfRounds'],
      // });
      // if (!project?.qfRounds?.some(round => round.id === activeRound?.id)) {
      //   return 0; // Project is not in this QF round
      // }
    }
  }

  if (!activeRound) {
    return 0;
  }

  const projectPolRoundCap = activeRound.cumulativePOLCapPerProject || 0;
  const userPolRoundCap = activeRound.cumulativePOLCapPerUserPerProject || 0;

  if (isEarlyAccess) {
    const projectRecord = await getEaProjectRoundRecord({
      projectId,
      eaRoundId: activeRound.id,
    });

    if (projectRecord.totalDonationAmount > projectPolRoundCap) {
      // Project has reached its cap
      return 0;
    }

    const userRecord = await getUserProjectSeasonRecord({
      projectId,
      userId,
      seasonNumber: activeRound.seasonNumber,
    });

    return Math.max(
      0,
      Math.min(
        projectPolRoundCap -
          projectRecord.totalDonationAmount -
          (projectRecord.cumulativePastRoundsDonationAmounts || 0), // project unused cap
        userPolRoundCap - (userRecord?.eaTotalDonationAmount || 0), // user unused cap for EA rounds only
      ),
    );
  } else {
    // QF Round
    const projectRecord = await getQfProjectRoundRecord({
      projectId,
      qfRoundId: activeRound.id,
    });

    // Get user's donations for this season (only QF round donations count towards cap)
    const userRecord = await getUserProjectSeasonRecord({
      projectId,
      userId,
      seasonNumber: activeRound.seasonNumber,
    });

    const projectCloseCap = activeQfRound?.roundPOLCloseCapPerProject || 0;

    // Calculate total collected across all rounds
    const totalCollected =
      (projectRecord?.totalDonationAmount || 0) +
      (projectRecord?.cumulativePastRoundsDonationAmounts || 0);

    // If project has reached total cap across all rounds, return 0
    if (totalCollected >= projectCloseCap) {
      return 0;
    }

    // Calculate remaining project cap considering all rounds
    const remainingProjectCap = projectPolRoundCap - totalCollected;

    // Calculate project cap considering close cap
    const projectCap = Math.max(
      remainingProjectCap,
      Math.min(
        250, // 250 POL between qf round cap and qf round close
        projectCloseCap - totalCollected, // project close cap
      ),
    );

    // User cap only considers QF round donations
    const anyUserCap = Math.min(projectCap, userPolRoundCap);

    // Only subtract QF donations from the user cap
    return Math.max(0, anyUserCap - (userRecord?.qfTotalDonationAmount || 0));
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
    !user.skipVerification &&
    !user.hasEnoughGitcoinAnalysisScore &&
    !user.hasEnoughGitcoinPassportScore
  ) {
    throw new Error(
      `analysis score is less than ${GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE}
       and passport score is less than ${GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE}`,
    );
  }
  const activeQfRound = await findActiveQfRound();
  if (!activeQfRound) {
    return 0;
  }
  const userProjectSeasonRecord = await getUserProjectSeasonRecord({
    projectId,
    userId: user.id,
    seasonNumber: activeQfRound.seasonNumber,
  });
  const qfTotalDonationAmount =
    userProjectSeasonRecord?.qfTotalDonationAmount || 0;
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
