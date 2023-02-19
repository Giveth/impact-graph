import { UpdateResult } from 'typeorm';
import {
  FilterField,
  Project,
  ProjectUpdate,
  ProjStatus,
  SortingField,
} from '../entities/project';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';
import { ProjectAddress } from '../entities/projectAddress';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { User, publicSelectionFields } from '../entities/user';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { OrderDirection, ProjectResolver } from '../resolvers/projectResolver';

export const findProjectById = (projectId: number): Promise<Project | null> => {
  // return Project.findOne({ id: projectId });

  return Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoin('project.adminUser', 'user')
    .addSelect(publicSelectionFields)
    .where({
      id: projectId,
    })
    .getOne();
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
  } = params;

  let query = Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect('project.users', 'users')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoinAndSelect('project.organization', 'organization')
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
    ])
    .where(`project.statusId = ${ProjStatus.active} AND project.listed = true`);

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

  switch (sortingBy) {
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
      query.orderBy('project.updatedAt', OrderDirection.DESC);
      break;
    case SortingField.Oldest:
      query.orderBy('project.creationDate', OrderDirection.ASC);
      break;
    case SortingField.QualityScore:
      query.orderBy('project.qualityScore', OrderDirection.DESC);
      break;
    case SortingField.GIVPower:
      query
        .orderBy(`project.verified`, OrderDirection.DESC)
        .addOrderBy(
          'projectPower.totalPower',
          OrderDirection.DESC,
          'NULLS LAST',
        );

      break;
    default:
      query
        .orderBy('projectPower.totalPower', OrderDirection.DESC)
        .addOrderBy(`project.verified`, OrderDirection.DESC);
      break;
  }

  return query.take(limit).skip(skip);
};

export const projectsWithoutUpdateAfterTimeFrame = async (date: Date) => {
  return Project.createQueryBuilder('project')
    .leftJoinAndSelect(
      'project.projectVerificationForm',
      'projectVerificationForm',
    )
    .leftJoin('project.adminUser', 'user')
    .where('project.isImported = false')
    .andWhere('project.verified = true')
    .andWhere('project.updatedAt < :badgeRevokingDate', {
      badgeRevokingDate: date,
    })
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

export const verifyMultipleProjects = async (params: {
  verified: boolean;
  projectsIds: string[] | number[];
}): Promise<UpdateResult> => {
  if (params.verified) {
    await Project.query(`
      UPDATE project
      SET "verificationStatus" = NULL
      WHERE id IN (${params.projectsIds?.join(',')})
    `);
  }

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
      networkId: relatedAddress.networkId,
      projectId: verificationForm.projectId,
      userId: verificationForm.user?.id,
      project,
      isRecipient: false,
    }).save();
  }

  project.contacts = verificationForm.projectContacts;
  await project.save();
  return (await findProjectById(project.id)) as Project;
};

export const verifyProject = async (params: {
  verified: boolean;
  projectId: number;
}): Promise<Project> => {
  const project = await Project.findOne({ where: { id: params.projectId } });

  if (!project)
    throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));

  project.verified = params.verified;
  if (params.verified) project.verificationStatus = null; // reset this field

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

export const userIsOwnerOfProject = async (
  viewerUserId: number,
  slug: string,
): Promise<boolean> => {
  return (
    await Project.query(
      `SELECT EXISTS(SELECT * FROM project WHERE "adminUserId" = $1 AND slug = $2)`,
      [viewerUserId, slug],
    )
  )[0].exists;
};

export const totalProjectsPerDate = async (
  fromDate?: string,
  toDate?: string,
): Promise<number> => {
  const query = Project.createQueryBuilder('project');

  if (fromDate) {
    query.andWhere(`project."creationDate" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`project."creationDate" <= '${toDate}'`);
  }

  query.cache(`totalProjectPerDate-${fromDate || ''}-${toDate || ''}`, 300000);

  return await query.getCount();
};

export const totalProjectsPerDateByMonthAndYear = async (
  fromDate?: string,
  toDate?: string,
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

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');
  query.cache(
    `totalProjectsPerDateByMonthAndYear-${fromDate || ''}-${toDate || ''}`,
    300000,
  );

  return query.getRawMany();
};

export const makeProjectListed = async (id: number): Promise<void> => {
  await Project.createQueryBuilder('broadcast_notification')
    .update<Project>(Project, {
      listed: true,
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
