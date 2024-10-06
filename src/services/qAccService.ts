import { FindOneOptions } from 'typeorm';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { ProjectUserRecord } from '../entities/projectUserRecord';
import { QfRound } from '../entities/qfRound';
import { findActiveEarlyAccessRound } from '../repositories/earlyAccessRoundRepository';
import { updateOrCreateProjectRoundRecord } from '../repositories/projectRoundRecordRepository';
import { updateOrCreateProjectUserRecord } from '../repositories/projectUserRecordRepository';
import { findActiveQfRound } from '../repositories/qfRoundRepository';

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
    select: ['id', 'totalDonationAmount'],
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
  const isEarlyAccess = !!activeEarlyAccessRound;

  if (isEarlyAccess) {
    activeRound = activeEarlyAccessRound;
  } else {
    const activeQfRound = await findActiveQfRound();
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

  const cumulativeUSDCapPerProject = activeRound.cumulativeCapPerProject || 0;
  const cumulativeUSDCapPerUserPerProject =
    activeRound.cumulativeCapPerUserPerProject || 0;
  const tokenPrice = activeRound.tokenPrice || Number.MAX_SAFE_INTEGER / 2;

  const projectPolRoundCap = cumulativeUSDCapPerProject / tokenPrice;
  const userPolRoundCap =
    (isEarlyAccess
      ? cumulativeUSDCapPerUserPerProject
      : activeRound.roundUSDCapPerUserPerProject!) / tokenPrice; // 2500$ in the qfRound

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

    return Math.min(
      projectPolRoundCap - projectRecord.totalDonationAmount, // project unused cap
      userPolRoundCap - userRecord.totalDonationAmount, // user unused cap
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

    // 250 USD is the minimum donation amount
    const projectCap = Math.max(
      projectPolRoundCap - (projectRecord?.totalDonationAmount || 0),
      250 / tokenPrice, // at least 250 for any distinct user
    );

    const effectiveCap =
      userRecord.eaTotalDonationAmount > 0
        ? 2 * userPolRoundCap
        : userPolRoundCap;
    const anyUserCall = Math.min(projectCap, effectiveCap);

    return Math.max(0, anyUserCall - userRecord.qfTotalDonationAmount);
  }
};

export default {
  getQAccDonationCap,
};
