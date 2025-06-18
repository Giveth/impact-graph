import { In } from 'typeorm';
import { Cause, CauseStatus, ListingStatus } from '../entities/cause';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';

export enum CauseSortField {
  GIVPOWER = 'givPower',
  GIVBACK = 'givBack',
  CREATED_AT = 'createdAt',
  AMOUNT_RAISED = 'totalRaised',
  PROJECT_COUNT = 'activeProjectsCount',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

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
  return await Cause.getRepository().manager.transaction(
    async transactionalEntityManager => {
      const cause = new Cause();
      Object.assign(cause, {
        ...causeData,
        ownerId: owner.id,
        projects,
      });

      const savedCause = await transactionalEntityManager.save(cause);

      // Update user's ownedCausesCount
      await transactionalEntityManager.update(
        User,
        { id: owner.id },
        { ownedCausesCount: () => '"ownedCausesCount" + 1' },
      );

      // Return the cause with all relations
      const result = await transactionalEntityManager.findOne(Cause, {
        where: { id: savedCause.id },
        relations: ['owner', 'projects'],
      });

      if (!result) {
        throw new Error('Failed to retrieve created cause');
      }

      return result;
    },
  );
};

export const activateCause = async (causeId: string): Promise<Cause> => {
  const cause = await findCauseByCauseId(causeId);
  if (!cause) {
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
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
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
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
  chainId?: number,
  searchTerm?: string,
  sortBy?: CauseSortField,
  sortDirection?: SortDirection,
  listingStatus?: ListingStatus | 'all',
): Promise<Cause[]> => {
  const queryBuilder = Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.owner', 'owner')
    .leftJoinAndSelect('cause.projects', 'projects');

  // Apply listing status filter
  if (listingStatus) {
    if (listingStatus !== 'all') {
      queryBuilder.where('cause.listingStatus = :listingStatus', {
        listingStatus,
      });
    } else {
      queryBuilder.where('1 = 1'); // Start with a default condition to avoid query errors
    }
  } else {
    // Default to Listed status if no listing status specified
    queryBuilder.where('cause.listingStatus = :listingStatus', {
      listingStatus: ListingStatus.Listed,
    });
  }

  // Apply filters
  if (chainId) {
    queryBuilder.andWhere('cause.chainId = :chainId', { chainId });
  }

  if (searchTerm) {
    queryBuilder.andWhere(
      '(LOWER(cause.title) LIKE LOWER(:searchTerm) OR LOWER(cause.description) LIKE LOWER(:searchTerm))',
      { searchTerm: `%${searchTerm}%` },
    );
  }

  // Apply sorting
  if (sortBy) {
    const direction = sortDirection || SortDirection.DESC;
    queryBuilder.orderBy(`cause.${sortBy}`, direction);
  } else {
    // Default sort by newest
    queryBuilder.orderBy('cause.createdAt', SortDirection.DESC);
  }

  // Apply pagination
  if (limit) {
    queryBuilder.take(limit);
  }
  if (offset) {
    queryBuilder.skip(offset);
  }

  return queryBuilder.getMany();
};
