import { SelectQueryBuilder, UpdateResult } from 'typeorm';
import {
  Cause,
  FilterField,
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
  SortingField,
} from '../entities/project';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';
import { ProjectAddress } from '../entities/projectAddress';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { publicSelectionFields } from '../entities/user';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { OrderDirection, ProjectResolver } from '../resolvers/projectResolver';
import { getAppropriateNetworkId } from '../services/chains';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Donation } from '../entities/donation';
import { FeaturedUpdate } from '../entities/featuredUpdate';
import { ProjectSocialMedia } from '../entities/projectSocialMedia';
import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { Reaction } from '../entities/reaction';
import { SocialProfile } from '../entities/socialProfile';
import { PreviousRoundRank } from '../entities/previousRoundRank';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { ProjectQfRound } from '../entities/projectQfRound';
import { DraftDonation } from '../entities/draftDonation';

export const findProjectById = (projectId: number): Promise<Project | null> => {
  // return Project.findOne({ id: projectId });

  return Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoinAndSelect('project.socialMedia', 'socialMedia')
    .leftJoinAndSelect('project.anchorContracts', 'anchor_contract_address')
    .leftJoinAndSelect('project.qfRounds', 'qfRounds')
    .leftJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields)
    .where({
      id: projectId,
    })
    .getOne();
};

export const verifiedProjectsAddressesWithOptimism = async (): Promise<
  string[]
> => {
  const recipients = await Project.createQueryBuilder('project')
    .select('LOWER(addresses.address) AS recipient')
    .innerJoin('project.addresses', 'addresses', 'addresses.networkId = 10')
    .where(
      `project.verified = true AND project.isImported = false AND project.reviewStatus = 'Listed'`,
    )
    .getRawMany();

  return recipients.map(recipientAddress => recipientAddress.recipient);
};

export const findProjectsByIdArray = (
  projectIds: number[],
): Promise<Project[]> => {
  return Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields)
    .where('project.id IN (:...ids)')
    .setParameter('ids', projectIds)
    .getMany();
};

// return query without execution
export type FilterProjectQueryInputParams = {
  limit: number;
  skip: number;
  searchTerm?: string;
  category?: string;
  mainCategory?: string;
  filters?: FilterField[];
  slugArray?: string[];
  sortingBy?: SortingField;
  qfRoundId?: number;
  activeQfRoundId?: number;
  qfRoundSlug?: string;
  includeUnlisted?: boolean;
  projectType?: string;
};
export const filterProjectsQuery = (params: FilterProjectQueryInputParams) => {
  const {
    limit,
    skip,
    searchTerm,
    category,
    mainCategory,
    filters,
    sortingBy,
    slugArray,
    qfRoundId,
    qfRoundSlug,
    activeQfRoundId,
    includeUnlisted,
    projectType,
  } = params;

  // Convert projectType to lowercase to ensure consistent filtering
  const normalizedProjectType = projectType?.toLowerCase() || 'project';

  let queryBuilderBase: SelectQueryBuilder<Project | Cause>;
  // Need to change entity to prevent Project type being set wrongly
  if (normalizedProjectType === 'cause') {
    queryBuilderBase = Cause.createQueryBuilder('project');
  } else {
    queryBuilderBase = Project.createQueryBuilder('project');
  }

  let query = queryBuilderBase
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.addresses', 'addresses')
    // We dont need it right now, but I comment it because we may need it later
    // .leftJoinAndSelect('project.anchorContracts', 'anchor_contract_address')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.qfRounds', 'qfRounds')
    // you can alias it as user but it still is mapped as adminUser
    // like defined in our project entity
    .innerJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields) // aliased selection
    .leftJoinAndSelect(
      'project.categories',
      'categories',
      'categories.isActive = :isActive',
      { isActive: true },
    )
    .leftJoinAndSelect('categories.mainCategory', 'mainCategory')
    .leftJoin('project.projectPower', 'projectPower')
    .addSelect([
      'projectPower.totalPower',
      'projectPower.powerRank',
      'projectPower.round',
    ]);

  if (includeUnlisted) {
    query = query.where(`project.statusId = ${ProjStatus.active}`);
  } else {
    query = query.where(
      `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
      { reviewStatus: ReviewStatus.Listed },
    );
  }

  // Filter by projectType
  if (
    normalizedProjectType &&
    (normalizedProjectType === 'cause' || normalizedProjectType === 'project')
  ) {
    query = query.andWhere('project.projectType = :projectType', {
      projectType: normalizedProjectType,
    });
  }

  const isFilterByQF =
    !!filters?.find(f => f === FilterField.ActiveQfRound) && activeQfRoundId;

  if (qfRoundId || isFilterByQF) {
    query.innerJoinAndSelect(
      'project.qfRounds',
      'qf_rounds',
      'qf_rounds.id = :qfRoundId',
      { qfRoundId: qfRoundId ? qfRoundId : activeQfRoundId },
    );
  } else if (qfRoundSlug) {
    query.innerJoinAndSelect(
      'project.qfRounds',
      'qf_rounds',
      `qf_rounds.slug = :qfRoundSlug`,
      { qfRoundSlug },
    );
  }
  if (!sortingBy || sortingBy === SortingField.InstantBoosting) {
    query = query
      .leftJoin('project.projectInstantPower', 'projectInstantPower')
      .addSelect([
        'projectInstantPower.totalPower',
        'projectInstantPower.powerRank',
      ]);
  }

  // Filters
  query = ProjectResolver.addCategoryQuery(query, category);
  query = ProjectResolver.addMainCategoryQuery(query, mainCategory);
  query = ProjectResolver.addSearchQuery(query, searchTerm);
  query = ProjectResolver.addFiltersQuery(query, filters);
  if (slugArray && slugArray.length > 0) {
    // This is used for getting projects that manually has been set to campaigns
    // TODO this doesnt query slug in project.slugHistory, but we should add it later
    query.andWhere(`project.slug IN (:...slugs)`, {
      slugs: slugArray,
    });
  }
  // query = ProjectResolver.addUserReaction(query, connectedWalletUserId, user);

  if (isFilterByQF && sortingBy === SortingField.EstimatedMatching) {
    query.leftJoin(
      'project.projectEstimatedMatchingView',
      'projectEstimatedMatchingView',
      'projectEstimatedMatchingView.qfRoundId = :qfRoundId',
      { qfRoundId: activeQfRoundId },
    );
  }

  switch (sortingBy) {
    case SortingField.MostNumberOfProjects:
      query.orderBy('project.activeProjectsCount', OrderDirection.DESC);
      break;
    case SortingField.LeastNumberOfProjects:
      query.orderBy('project.activeProjectsCount', OrderDirection.ASC);
      break;
    case SortingField.MostFunded:
      query.orderBy('project.totalDonations', OrderDirection.DESC);
      break;
    case SortingField.MostLiked:
      query.orderBy('project.totalReactions', OrderDirection.DESC);
      break;
    case SortingField.Newest:
      query.orderBy('project.creationDate', OrderDirection.DESC);
      break;
    case SortingField.RecentlyUpdated:
      query
        .orderBy('project.updatedAt', OrderDirection.DESC)
        .andWhere('organization.label != :label', {
          label: ORGANIZATION_LABELS.ENDAOMENT,
        });
      break;
    case SortingField.Oldest:
      query.orderBy('project.creationDate', OrderDirection.ASC);
      break;
    case SortingField.QualityScore:
      query.orderBy('project.qualityScore', OrderDirection.DESC);
      break;
    case SortingField.GIVPower:
      query
        .addOrderBy('project.isGivbackEligible', 'DESC') // Primary sorting condition
        .addOrderBy('project.verified', 'DESC') // Secondary sorting condition
        .addOrderBy(
          'projectPower.totalPower',
          OrderDirection.DESC,
          'NULLS LAST',
        );
      break;
    case SortingField.InstantBoosting: // This is our default sorting
      query
        .addOrderBy(
          'projectInstantPower.totalPower',
          OrderDirection.DESC,
          'NULLS LAST',
        )
        .addOrderBy('project.isGivbackEligible', 'DESC') // Primary sorting condition
        .addOrderBy('project.verified', 'DESC'); // Secondary sorting condition

      if (isFilterByQF) {
        query.addOrderBy(
          'project.sumDonationValueUsdForActiveQfRound',
          OrderDirection.DESC,
          'NULLS LAST',
        );
      } else {
        query.addOrderBy('project.totalDonations', OrderDirection.DESC);
      }
      query.addOrderBy('project.totalReactions', OrderDirection.DESC);
      break;
    case SortingField.ActiveQfRoundRaisedFunds:
      if (activeQfRoundId) {
        query
          .orderBy(
            'project.sumDonationValueUsdForActiveQfRound',
            OrderDirection.DESC,
            'NULLS LAST',
          )
          .addOrderBy('project.isGivbackEligible', 'DESC') // Primary sorting condition
          .addOrderBy('project.verified', 'DESC'); // Secondary sorting condition
      }
      break;
    case SortingField.EstimatedMatching:
      if (activeQfRoundId) {
        query
          .addSelect('projectEstimatedMatchingView.sqrtRootSum')
          .orderBy(
            'projectEstimatedMatchingView.sqrtRootSum',
            OrderDirection.DESC,
            'NULLS LAST',
          )
          .addOrderBy('project.isGivbackEligible', 'DESC') // Primary sorting condition
          .addOrderBy('project.verified', 'DESC'); // Secondary sorting condition
      }
      break;
    case SortingField.BestMatch:
      break;
    default:
      query
        .addOrderBy('projectInstantPower.totalPower', OrderDirection.DESC)
        .addOrderBy('project.isGivbackEligible', 'DESC') // Primary sorting condition
        .addOrderBy('project.verified', 'DESC'); // Secondary sorting condition
      break;
  }

  return query.take(limit).skip(skip);
};

export const projectsWithoutUpdateAfterTimeFrame = async (
  date: Date,
): Promise<Project[]> => {
  return await Project.createQueryBuilder('project')
    .select([
      'project.id',
      'project.slug',
      'project.verificationStatus',
      'project.adminUserId',
      'project.latestUpdateCreationDate',
      'project.title',
    ])
    .where('project.isImported = false')
    .andWhere('project.isGivbackEligible = true')
    .andWhere(
      '(project.verificationStatus NOT IN (:...statuses) OR project.verificationStatus IS NULL)',
      {
        statuses: [RevokeSteps.UpForRevoking, RevokeSteps.Revoked],
      },
    )
    .andWhere('project.latestUpdateCreationDate < :date', { date })
    .getMany();
};

export const findProjectBySlug = (slug: string): Promise<Project | null> => {
  // check current slug and previous slugs
  return (
    Project.createQueryBuilder('project')
      .leftJoinAndSelect('project.status', 'status')
      .leftJoinAndSelect('project.addresses', 'addresses')
      .leftJoinAndSelect('project.organization', 'organization')
      // you can alias it as user but it still is mapped as adminUser
      // like defined in our project entity
      .leftJoin('project.adminUser', 'user')
      .addSelect(publicSelectionFields)
      .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
        slug,
      })
      .getOne()
  );
};

export const findProjectIdBySlug = (slug: string): Promise<Project | null> => {
  // check current slug and previous slugs
  return Project.createQueryBuilder('project')
    .select('project.id')
    .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
      slug,
    })
    .getOne();
};

export const verifyMultipleProjects = async (params: {
  verified: boolean;
  projectsIds: string[] | number[];
}): Promise<UpdateResult> => {
  return Project.createQueryBuilder('project')
    .update<Project>(Project, {
      verified: params.verified,
    })
    .where('project.id IN (:...ids)')
    .setParameter('ids', params.projectsIds)
    .returning('*')
    .updateEntity(true)
    .execute();
};

export const updateProjectWithVerificationForm = async (
  verificationForm: ProjectVerificationForm,
  project: Project,
): Promise<Project> => {
  const relatedAddresses =
    verificationForm?.managingFunds?.relatedAddresses || [];
  for (const relatedAddress of relatedAddresses) {
    await ProjectAddress.create({
      title: relatedAddress.title,
      address: relatedAddress.address,

      // Frontend doesn't send networkId for solana addresses so we set it to default solana chain id
      networkId: getAppropriateNetworkId({
        networkId: relatedAddress.networkId,
        chainType: relatedAddress.chainType,
      }),
      projectId: verificationForm.projectId,
      userId: verificationForm.user?.id,
      project,
      isRecipient: false,
    }).save();
  }
  const fetchedProject = await findProjectById(verificationForm.projectId);
  fetchedProject!.contacts = verificationForm.projectContacts;
  await fetchedProject!.save();
  return fetchedProject!;
};

export const verifyProject = async (params: {
  verified: boolean;
  projectId: number;
}): Promise<Project> => {
  const project = await Project.findOne({ where: { id: params.projectId } });

  if (!project)
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));

  project.verified = params.verified;

  return project.save();
};

export const findProjectByWalletAddress = async (
  walletAddress: string,
): Promise<Project | null> => {
  return Project.createQueryBuilder('project')
    .where(`LOWER("walletAddress") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('project.status', 'status')
    .getOne();
};

export const findProjectByWalletAddressAndNetwork = async (
  walletAddress: string,
  network: number,
): Promise<Project | null> => {
  return Project.createQueryBuilder('project')
    .innerJoin('project.addresses', 'address')
    .where(`LOWER(address."address") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .andWhere(`address."networkId" = :network`, { network })
    .leftJoinAndSelect('project.status', 'status')
    .getOne();
};

export const totalProjectsPerDate = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyListed?: boolean,
  onlyVerified?: boolean,
): Promise<number> => {
  const query = Project.createQueryBuilder('project');

  query.andWhere(`project.statusId = ${ProjStatus.active}`);

  if (fromDate) {
    query.andWhere(`project."creationDate" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`project."creationDate" <= '${toDate}'`);
  }

  if (onlyVerified) {
    query.andWhere('project."verified" = true');
  }

  if (onlyListed) {
    query.andWhere(`project.reviewStatus = :reviewStatus`, {
      reviewStatus: ReviewStatus.Listed,
    });
  }

  if (networkId) {
    query.innerJoin(
      `project.addresses`,
      'addresses',
      `addresses."networkId" = ${networkId}`,
    );
  }

  query.cache(
    `totalProjectPerDate-${fromDate || ''}-${toDate || ''}-${
      networkId || 'all'
    }-${onlyVerified || 'all'}-${onlyListed || 'all'}`,
    300000,
  );

  return await query.getCount();
};

export const totalProjectsPerDateByMonthAndYear = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyListed?: boolean,
  onlyVerified?: boolean,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = Project.createQueryBuilder('project').select(
    `COUNT(project.id) as total, EXTRACT(YEAR from project."creationDate") as year, EXTRACT(MONTH from project."creationDate") as month, CONCAT(CAST(EXTRACT(YEAR from project."creationDate") as VARCHAR), '/', CAST(EXTRACT(MONTH from project."creationDate") as VARCHAR)) as date`,
  );

  if (fromDate) {
    query.andWhere(`project."creationDate" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`project."creationDate" <= '${toDate}'`);
  }

  if (onlyVerified) {
    query.andWhere('project."verified" = true');
  }

  if (onlyListed) {
    query.andWhere(`project."reviewStatus" = 'Listed'`);
  }

  if (networkId) {
    query.innerJoin(
      `project.addresses`,
      'addresses',
      `addresses."networkId" = ${networkId}`,
    );
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');
  query.cache(
    `totalProjectsPerDateByMonthAndYear-${fromDate || ''}-${toDate || ''}-${
      networkId || 'all'
    }-${onlyVerified || 'all'}-${onlyListed || 'all'}`,
    300000,
  );

  return query.getRawMany();
};

export const makeProjectListed = async (id: number): Promise<void> => {
  await Project.createQueryBuilder('broadcast_notification')
    .update<Project>(Project, {
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    })
    .where(`id =${id}`)
    .updateEntity(true)
    .execute();
};

export const findProjectsBySlugArray = async (
  slugArray: string[],
): Promise<Project[]> => {
  // TODO should refactor it and convert it to single query
  const projects: Project[] = [];
  const result = await Promise.all(
    slugArray.map(slug => findProjectBySlug(slug)),
  );

  result.forEach(project => {
    if (project) {
      projects.push(project);
    }
  });
  return projects;
};

export const removeProjectAndRelatedEntities = async (
  projectId: number,
): Promise<void> => {
  // Delete related entities
  await Donation.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await Reaction.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectAddress.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectSocialMedia.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await AnchorContractAddress.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectStatusHistory.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectVerificationForm.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await FeaturedUpdate.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await SocialProfile.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectUpdate.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await PreviousRoundRank.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await ProjectQfRound.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await DraftDonation.createQueryBuilder()
    .delete()
    .where('projectId = :projectId', { projectId })
    .execute();

  await Project.createQueryBuilder()
    .delete()
    .where('id = :id', { id: projectId })
    .execute();
};

export const findQfRoundProjects = async (
  qfRoundId: number,
  params: {
    limit?: number;
    skip?: number;
    searchTerm?: string;
    filters?: FilterField[];
    sortingBy?: SortingField;
  } = {},
): Promise<[Project[], number]> => {
  const {
    limit = 10,
    skip = 0,
    searchTerm,
    filters = [],
    sortingBy = SortingField.QualityScore,
  } = params;

  let query = Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields)
    .leftJoin('project.projectPower', 'projectPower')
    .addSelect(['projectPower.totalPower', 'projectPower.powerRank'])
    .leftJoin('project.projectInstantPower', 'projectInstantPower')
    .addSelect([
      'projectInstantPower.totalPower',
      'projectInstantPower.powerRank',
    ])
    .leftJoinAndSelect(
      'project.projectQfRoundRelations',
      'projectQfRound',
      'projectQfRound.qfRoundId = :qfRoundId AND projectQfRound.projectId = project.id',
      { qfRoundId },
    )
    .innerJoinAndSelect(
      'project.qfRounds',
      'qfRounds',
      'qfRounds.id = :qfRoundId',
      { qfRoundId },
    )
    .distinct(true)
    .where('project.statusId = :statusId', { statusId: ProjStatus.active })
    .andWhere('project.reviewStatus = :reviewStatus', {
      reviewStatus: ReviewStatus.Listed,
    });

  // Apply search term
  if (searchTerm) {
    query = ProjectResolver.addSearchQuery(query, searchTerm);
  }

  // Apply filters
  if (filters && filters.length > 0) {
    query = ProjectResolver.addFiltersQuery(query, filters);
  }

  // Apply sorting
  if (sortingBy === SortingField.ActiveQfRoundRaisedFunds) {
    query
      .orderBy('projectQfRound.sumDonationValueUsd', 'DESC', 'NULLS LAST')
      .addOrderBy('project.isGivbackEligible', 'DESC')
      .addOrderBy('project.verified', 'DESC')
      .addOrderBy('project.creationDate', 'DESC');
  } else if (sortingBy === SortingField.MostFunded) {
    query
      .orderBy('project.totalDonations', 'DESC')
      .addOrderBy('project.isGivbackEligible', 'DESC')
      .addOrderBy('project.verified', 'DESC')
      .addOrderBy('project.creationDate', 'DESC');
  } else if (sortingBy === SortingField.Newest) {
    query
      .orderBy('project.creationDate', 'DESC')
      .addOrderBy('project.isGivbackEligible', 'DESC')
      .addOrderBy('project.verified', 'DESC');
  } else {
    // Default sorting
    query
      .orderBy('projectInstantPower.totalPower', 'DESC', 'NULLS LAST')
      .addOrderBy('project.isGivbackEligible', 'DESC')
      .addOrderBy('project.verified', 'DESC')
      .addOrderBy('project.creationDate', 'DESC');
  }

  return query.take(limit).skip(skip).getManyAndCount();
};
