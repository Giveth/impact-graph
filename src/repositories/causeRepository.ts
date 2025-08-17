import {
  Cause,
  ReviewStatus,
  ProjStatus,
  CauseProject,
} from '../entities/project';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { ChainType } from '../types/network';
import { getAppropriateNetworkId } from '../services/chains';
import {
  addBulkNewProjectAddress,
  findProjectRecipientAddressByProjectId,
} from './projectAddressRepository';
import { getSimilarTitleInProjectsRegex } from '../utils/validators/projectValidator';

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
    .leftJoinAndSelect('cause.status', 'status')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .where('cause.id = :id', { id })
    .andWhere('lower(cause.projectType) = lower(:projectType)', {
      projectType: 'cause',
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
    .andWhere('lower(cause.projectType) = lower(:projectType)', {
      projectType: 'cause',
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
    .where('lower(cause.projectType) = lower(:projectType)', {
      projectType: 'cause',
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
  const cause = Cause.create({
    ...causeData,
    adminUserId: owner.id,
    projectType: 'cause',
    walletAddress: causeData.fundingPoolAddress,
  });

  const savedCause = await cause.save();

  const projectAddress = {
    project: cause,
    user: owner,
    address: causeData.fundingPoolAddress,
    chainType: ChainType.EVM,
    networkId: getAppropriateNetworkId({
      networkId: cause.chainId,
      chainType: ChainType.EVM,
    }),
    isRecipient: true,
  };

  await addBulkNewProjectAddress([projectAddress]);

  savedCause.addresses = await findProjectRecipientAddressByProjectId({
    projectId: savedCause.id,
  });

  await savedCause.save();

  // Create cause-project relationships
  for (const project of projects) {
    await CauseProject.create({
      causeId: savedCause.id,
      projectId: project.id,
      amountReceived: 0,
      amountReceivedUsdValue: 0,
      causeScore: 0,
    }).save();
  }

  // Update user's ownedCausesCount
  await User.update(
    { id: owner.id },
    { ownedCausesCount: () => '"ownedCausesCount" + 1' },
  );

  // Return the cause with all relations
  // const result = await Cause.createQueryBuilder('cause')
  //   .leftJoinAndSelect('cause.adminUser', 'adminUser')
  //   .leftJoinAndSelect('cause.status', 'status')
  //   .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
  //   .leftJoinAndSelect('causeProjects.project', 'project')
  //   .leftJoinAndSelect('cause.categories', 'categories')
  //   .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
  //   .where('cause.id = :id', { id: savedCause.id })
  //   .getOne();

  // if (!result) {
  //   throw new Error('Failed to retrieve created cause');
  // }

  // result.causeProjects = await loadCauseProjects(result);

  return savedCause;
};

export const activateCause = async (causeId: number): Promise<Cause> => {
  const cause = await findCauseById(causeId);
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
  const cause = await findCauseById(causeId);
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
      projectType: 'cause',
    },
  });

  if (existingCause) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.CAUSE_TITLE_ALREADY_EXISTS),
    );
  }

  return true;
};

const titleReplacerRegex = /^\s+|\s+$|\s+(?=\s)/g;

export const validateCauseTitleForEdit = async (
  title: string,
  causeId: number,
): Promise<boolean> => {
  const cause = await findCauseById(causeId);
  if (!cause) {
    return false;
  }
  if (
    getSimilarTitleInProjectsRegex(cause?.title as string).test(
      title.replace(titleReplacerRegex, ''),
    )
  ) {
    // If the new title of cause is similar to older one , we dont call validateCauseTitle
    return true;
  }
  return validateCauseTitle(title);
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
      projectType: 'cause',
    },
  });

  if (existingCause) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_ALREADY_USED),
    );
  }

  return true;
};

// export const loadCauseProjects = async (
//   cause: Cause,
//   userRemoved: boolean | undefined = undefined,
// ): Promise<CauseProject[] | []> => {
//   if (cause.projectType.toLowerCase() === 'project') {
//     return [];
//   }

//   const baseQuery = await CauseProject.createQueryBuilder('causeProject')
//     .leftJoinAndSelect('causeProject.project', 'project')
//     .leftJoinAndSelect('project.status', 'status')
//     .leftJoinAndSelect('project.addresses', 'addresses')
//     .leftJoinAndSelect(
//       'project.socialProfiles',
//       'socialProfiles',
//       'socialProfiles.projectId = project.id',
//     )
//     .leftJoinAndSelect(
//       'project.socialMedia',
//       'socialMedia',
//       'socialMedia.projectId = project.id',
//     )
//     .leftJoinAndSelect('project.anchorContracts', 'anchor_contract_address')
//     .leftJoinAndSelect('project.projectPower', 'projectPower')
//     .leftJoinAndSelect('project.projectInstantPower', 'projectInstantPower')
//     .leftJoinAndSelect('project.projectFuturePower', 'projectFuturePower')
//     .leftJoinAndSelect('project.projectUpdates', 'projectUpdates')
//     .leftJoinAndSelect(
//       'project.categories',
//       'categories',
//       'categories.isActive = :isActive',
//       { isActive: true },
//     )
//     .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
//     .leftJoinAndSelect('project.organization', 'organization')
//     .leftJoinAndSelect('project.qfRounds', 'qfRounds')
//     .leftJoin('project.adminUser', 'user')
//     .addSelect(publicSelectionFields)
//     .where('causeProject.causeId = :causeId', { causeId: cause.id });

//   if (userRemoved !== undefined) {
//     baseQuery.andWhere('causeProject.userRemoved = :userRemoved', {
//       userRemoved,
//     });
//   }

//   const causeProjects = await baseQuery.getMany();
//   return causeProjects;
// };

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
    .leftJoinAndSelect('cause.causeProjects', 'causeProjects')
    .leftJoinAndSelect('causeProjects.project', 'project')
    .leftJoinAndSelect('cause.status', 'status')
    .leftJoinAndSelect('cause.categories', 'categories')
    .leftJoinAndSelect('project.projectPower', 'projectPower')
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .leftJoinAndSelect(
      'project.categories',
      'projectCategories',
      'projectCategories.isActive = :isActive',
      { isActive: true },
    )
    .leftJoinAndSelect('projectCategories.mainCategory', 'projectMainCategory')
    .leftJoinAndSelect('project.socialMedia', 'socialMedia')
    .where('lower(cause.projectType) = lower(:projectType)', {
      projectType: 'cause',
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
    queryBuilder.orderBy('cause.creationDate', SortDirection.DESC);
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
