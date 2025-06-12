import { In } from 'typeorm';
import { Cause, CauseStatus } from '../entities/cause';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';

export const findCauseById = async (id: number): Promise<Cause | null> => {
  return Cause.findOne({
    where: { id },
    relations: ['owner', 'projects'],
  });
};

export const findCauseByCauseId = async (
  causeId: string,
): Promise<Cause | null> => {
  return Cause.findOne({
    where: { causeId },
    relations: ['owner', 'projects'],
  });
};

export const findCausesByOwnerId = async (
  ownerId: number,
): Promise<Cause[]> => {
  return Cause.find({
    where: { ownerId },
    relations: ['owner', 'projects'],
  });
};

export const findCausesByProjectIds = async (
  projectIds: number[],
): Promise<Cause[]> => {
  const causes = await Cause.createQueryBuilder('cause')
    .innerJoinAndSelect('cause.owner', 'owner')
    .innerJoinAndSelect('cause.projects', 'project')
    .where('project.id IN (:...projectIds)', { projectIds })
    .getMany();
  // Deduplicate by cause.id
  const uniqueCauses = new Map<number, Cause>();
  for (const cause of causes) {
    uniqueCauses.set(cause.id, cause);
  }
  return Array.from(uniqueCauses.values());
};

export const createCause = async (
  causeData: Partial<Cause>,
  owner: User,
  projects: Project[],
): Promise<Cause> => {
  const cause = new Cause();
  Object.assign(cause, {
    ...causeData,
    ownerId: owner.id,
    projects,
  });

  const savedCause = await cause.save();

  // Update user's ownedCausesCount
  await User.update(
    { id: owner.id },
    { ownedCausesCount: () => '"ownedCausesCount" + 1' },
  );

  // Return the cause with all relations
  return Cause.findOne({
    where: { id: savedCause.id },
    relations: ['owner', 'projects'],
  }) as Promise<Cause>;
};

export const activateCause = async (causeId: string): Promise<Cause> => {
  const cause = await findCauseByCauseId(causeId);
  if (!cause) {
    throw new Error('Cause not found');
  }

  if (cause.status === CauseStatus.ACTIVE) {
    return cause;
  }

  cause.status = CauseStatus.ACTIVE;
  await cause.save();

  // Update projects' activeCausesCount
  await Project.update(
    { id: In(cause.projects.map(p => p.id)) },
    { activeCausesCount: () => '"activeCausesCount" + 1' },
  );

  return cause;
};

export const deactivateCause = async (causeId: string): Promise<Cause> => {
  const cause = await findCauseByCauseId(causeId);
  if (!cause) {
    throw new Error('Cause not found');
  }

  if (cause.status === CauseStatus.DEACTIVE) {
    return cause;
  }

  const wasActive = cause.status === CauseStatus.ACTIVE;
  cause.status = CauseStatus.DEACTIVE;
  await cause.save();

  // Update projects' activeCausesCount only if the cause was previously active
  if (wasActive) {
    await Project.update(
      { id: In(cause.projects.map(p => p.id)) },
      { activeCausesCount: () => '"activeCausesCount" - 1' },
    );
  }

  return cause;
};

export const validateCauseTitle = async (title: string): Promise<boolean> => {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_INPUT));
  }

  // Check if a cause with similar title exists
  const existingCause = await Cause.findOne({
    where: {
      title: trimmedTitle,
    },
  });

  if (existingCause) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.CAUSE_TITLE_ALREADY_EXISTS),
    );
  }

  return true;
};

export const validateTransactionHash = async (
  depositTxHash: string,
): Promise<boolean> => {
  const trimmedTxHash = depositTxHash.trim().toLowerCase();
  if (!trimmedTxHash) {
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
  }

  // Check if a cause with this transaction hash exists
  const existingCause = await Cause.findOne({
    where: {
      depositTxHash: trimmedTxHash,
    },
  });

  if (existingCause) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_ALREADY_USED),
    );
  }

  return true;
};

export const findAllCauses = async (
  limit?: number,
  offset?: number,
): Promise<Cause[]> => {
  const queryBuilder = Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.owner', 'owner')
    .leftJoinAndSelect('cause.projects', 'projects')
    .orderBy('cause.createdAt', 'DESC');

  if (limit) {
    queryBuilder.take(limit);
  }
  if (offset) {
    queryBuilder.skip(offset);
  }

  return queryBuilder.getMany();
};
