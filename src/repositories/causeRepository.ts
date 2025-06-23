import {
  Cause,
  ReviewStatus,
  ProjStatus,
  ProjectType,
} from '../entities/project';
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
  return Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.adminUser', 'adminUser')
    .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
    .leftJoinAndSelect('cause.status', 'status')
    .leftJoinAndSelect('causeProjects.project', 'project')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .where('cause.id = :id', { id })
    .andWhere('cause.projectType = :projectType', {
      projectType: ProjectType.CAUSE,
    })
    .getOne();
};

export const findCauseByCauseId = async (
  causeId: number,
): Promise<Cause | null> => {
  return Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.adminUser', 'adminUser')
    .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
    .leftJoinAndSelect('causeProjects.project', 'project')
    .leftJoinAndSelect('cause.status', 'status')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .where('cause.id = :causeId', { causeId })
    .andWhere('cause.projectType = :projectType', {
      projectType: ProjectType.CAUSE,
    })
    .getOne();
};

export const findCausesByOwnerId = async (
  ownerId: number,
): Promise<Cause[]> => {
  return Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.adminUser', 'adminUser')
    .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
    .leftJoinAndSelect('causeProjects.project', 'project')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .where('cause.adminUserId = :ownerId', { ownerId })
    .andWhere('cause.projectType = :projectType', {
      projectType: ProjectType.CAUSE,
    })
    .getMany();
};

export const findCausesByProjectIds = async (
  projectIds: number[],
): Promise<Cause[]> => {
  const causes = await Cause.createQueryBuilder('cause')
    .innerJoinAndSelect('cause.adminUser', 'adminUser')
    .innerJoinAndSelect('cause.causeProjects', 'causeProjects')
    .innerJoinAndSelect('causeProjects.project', 'project')
    .where('cause.projectType = :projectType', {
      projectType: ProjectType.CAUSE,
    })
    .andWhere('project.id IN (:...projectIds)', { projectIds })
    .getMany();

  // Deduplicate by cause.id
  const uniqueCauses = new Map<number, Cause>();
  for (const cause of causes) {
    uniqueCauses.set(cause.id, cause);
  }
  return Array.from(uniqueCauses.values());
};

export const createCause = async (
  causeData: any,
  owner: User,
  projects: Project[],
): Promise<Cause> => {
  return await Cause.getRepository().manager.transaction(
    async transactionalEntityManager => {
      const cause = new Cause();
      Object.assign(cause, {
        ...causeData,
        adminUserId: owner.id,
        projectType: ProjectType.CAUSE,
        walletAddress: causeData.fundingPoolAddress,
      });

      const savedCause = await transactionalEntityManager.save(cause);

      // Create cause-project relationships
      for (const project of projects) {
        await transactionalEntityManager.save('CauseProject', {
          causeId: savedCause.id,
          projectId: project.id,
          amountReceived: 0,
          amountReceivedUsdValue: 0,
          causeScore: 0,
        });
      }

      // Update user's ownedCausesCount
      await transactionalEntityManager.update(
        User,
        { id: owner.id },
        { ownedCausesCount: () => '"ownedCausesCount" + 1' },
      );

      // Return the cause with all relations
      const result = await transactionalEntityManager
        .createQueryBuilder(Cause, 'cause')
        .leftJoinAndSelect('cause.adminUser', 'adminUser')
        .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
        .leftJoinAndSelect('causeProjects.project', 'project')
        .leftJoinAndSelect('cause.status', 'status')
        .leftJoinAndSelect('cause.categories', 'categories')
        .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
        .where('cause.id = :id', { id: savedCause.id })
        .getOne();

      if (!result) {
        throw new Error('Failed to retrieve created cause');
      }

      return result;
    },
  );
};

export const activateCause = async (causeId: number): Promise<Cause> => {
  const cause = await findCauseByCauseId(causeId);
  if (!cause) {
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
  }

  if (cause.statusId === ProjStatus.active) {
    return cause;
  }

  cause.statusId = ProjStatus.active;
  await cause.save();

  return cause;
};

export const deactivateCause = async (causeId: number): Promise<Cause> => {
  const cause = await findCauseByCauseId(causeId);
  if (!cause) {
    throw new Error(i18n.__(translationErrorMessagesKeys.CAUSE_NOT_FOUND));
  }

  if (cause.statusId === ProjStatus.deactive) {
    return cause;
  }

  cause.statusId = ProjStatus.deactive;
  await cause.save();

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
      projectType: ProjectType.CAUSE,
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
      projectType: ProjectType.CAUSE,
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
  listingStatus?: ReviewStatus | 'all',
): Promise<Cause[]> => {
  const queryBuilder = Cause.createQueryBuilder('cause')
    .leftJoinAndSelect('cause.adminUser', 'adminUser')
    .leftJoinAndSelect('cause.status', 'status')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
    .leftJoinAndSelect('causeProjects.project', 'project')
    .where('cause.projectType = :projectType', {
      projectType: ProjectType.CAUSE,
    });

  // Apply listing status filter
  if (listingStatus) {
    if (listingStatus !== 'all') {
      queryBuilder.andWhere('cause.reviewStatus = :reviewStatus', {
        reviewStatus: listingStatus,
      });
    }
  } else {
    // Default to Listed status if no listing status specified
    queryBuilder.andWhere('cause.reviewStatus = :reviewStatus', {
      reviewStatus: ReviewStatus.Listed,
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
