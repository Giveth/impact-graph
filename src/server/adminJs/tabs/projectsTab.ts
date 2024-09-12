import fs from 'fs';
import path from 'path';
import adminJs from 'adminjs';
import { SelectQueryBuilder } from 'typeorm';
import {
  ActionResponse,
  After,
} from 'adminjs/src/backend/actions/action.interface';
import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import {
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
} from '../../../entities/project';
import { canAccessProjectAction, ResourceActions } from '../adminJsPermissions';
import {
  findProjectById,
  findProjectsByIdArray,
} from '../../../repositories/projectRepository';
import { NOTIFICATIONS_EVENT_NAMES } from '../../../analytics/analytics';
import { HISTORY_DESCRIPTIONS } from '../../../entities/projectStatusHistory';
import { getNotificationAdapter } from '../../../adapters/adaptersFactory';
import { changeUserBoostingsAfterProjectCancelled } from '../../../services/powerBoostingService';
import { refreshUserProjectPowerView } from '../../../repositories/userProjectPowerViewRepository';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../../../repositories/projectPowerViewRepository';
import { logger } from '../../../utils/logger';
import { findSocialProfilesByProjectId } from '../../../repositories/socialProfileRepository';
import { findProjectUpdatesByProjectId } from '../../../repositories/projectUpdateRepository';
import {
  AdminJsContextInterface,
  AdminJsProjectsQuery,
  AdminJsRequestInterface,
  projectHeaders,
} from '../adminJs-types';
import { ProjectStatus } from '../../../entities/projectStatus';
import { messages } from '../../../utils/messages';
import {
  addProjectsSheetToSpreadsheet,
  initExportSpreadsheet,
} from '../../../services/googleSheets';
import { NETWORKS_IDS_TO_NAME } from '../../../provider';
import {
  getVerificationFormByProjectId,
  makeFormDraft,
  makeFormVerified,
} from '../../../repositories/projectVerificationRepository';
import { FeaturedUpdate } from '../../../entities/featuredUpdate';
import { findActiveQfRound } from '../../../repositories/qfRoundRepository';
import { User } from '../../../entities/user';
import { refreshProjectEstimatedMatchingView } from '../../../services/projectViewsService';
import { extractAdminJsReferrerUrlParams } from '../adminJs';
import { relateManyProjectsToQfRound } from '../../../repositories/qfRoundRepository2';
import { Category } from '../../../entities/category';

// add queries depending on which filters were selected
export const buildProjectsQuery = (
  queryStrings: AdminJsProjectsQuery,
): SelectQueryBuilder<Project> => {
  const query = Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.addresses', 'addresses')
    .leftJoinAndSelect('project.adminUser', 'adminUser')
    .where('addresses.isRecipient = true')
    .addOrderBy('addresses.networkId', 'ASC');

  if (queryStrings.title)
    query.andWhere('project.title ILIKE :title', {
      title: `%${queryStrings.title}%`,
    });

  if (queryStrings.slug)
    query.andWhere('project.slug ILIKE :slug', { title: queryStrings.slug });

  if (queryStrings.verified)
    query.andWhere('project.verified = :verified', {
      verified: queryStrings.verified === 'true',
    });

  if (queryStrings.isImported)
    query.andWhere('project.isImported = :isImported', {
      isImported: queryStrings.isImported === 'true',
    });

  // if (queryStrings.listed)
  //   query.andWhere('project.listed = :listed', {
  //     listed: queryStrings.listed === 'true',
  //   });
  //
  if (queryStrings.reviewStatus)
    query.andWhere('project.reviewStatus ILIKE :reviewStatus', {
      reviewStatus: `%${queryStrings.reviewStatus}%`,
    });

  if (queryStrings.statusId)
    query.andWhere('project."statusId" = :statusId', {
      statusId: queryStrings.statusId,
    });

  if (queryStrings['creationDate~~from'])
    query.andWhere('project."creationDate" >= :createdFrom', {
      createdFrom: queryStrings['creationDate~~from'],
    });

  if (queryStrings['creationDate~~to'])
    query.andWhere('project."creationDate" <= :createdTo', {
      createdTo: queryStrings['creationDate~~to'],
    });

  if (queryStrings['updatedAt~~from'])
    query.andWhere('project."updatedAt" >= :updatedFrom', {
      updatedFrom: queryStrings['updatedAt~~from'],
    });

  if (queryStrings['updatedAt~~to'])
    query.andWhere('project."updatedAt" <= :updatedTo', {
      updatedTo: queryStrings['updatedAt~~to'],
    });

  return query;
};

export const addFeaturedProjectUpdate = async (
  context: AdminJsContextInterface,
  request,
) => {
  const { records } = context;
  try {
    const updateIds = request?.query?.recordIds
      ?.split(',')
      ?.map(id => Number(id));
    const projectUpdates = await ProjectUpdate.createQueryBuilder(
      'projectUpdate',
    )
      .innerJoinAndMapOne(
        'projectUpdate.project',
        Project,
        'project',
        'project.id = projectUpdate.projectId AND projectUpdate.isMain = false',
      )
      .where('projectUpdate.id IN (:...updateIds)', { updateIds })
      .andWhere('projectUpdate.isMain = false')
      .andWhere(
        `project.statusId = :projectStatus AND project.reviewStatus = :reviewStatus`,
        {
          projectStatus: ProjStatus.active,
          reviewStatus: ReviewStatus.Listed,
        },
      )
      .getMany();

    for (const update of projectUpdates) {
      const featured = await FeaturedUpdate.createQueryBuilder('featuredUpdate')
        .where('featuredUpdate.projectId = :projectId', {
          projectId: update!.project!.id,
        })
        .getOne();

      if (featured) continue; // ignore if already project featured

      const featuredProject = FeaturedUpdate.create({
        projectUpdateId: update.id,
        projectId: update.project!.id,
      });

      await featuredProject.save();
    }
  } catch (error) {
    logger.error('addFeaturedProjectUpdate error', error);
    throw error;
  }
  return {
    redirectUrl: '/admin/resources/ProjectUpdate',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: `ProjectUpdates(s) successfully added to the featured Project list`,
      type: 'success',
    },
  };
};

export const verifyProjects = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  verified: boolean = true,
  revokeBadge: boolean = false,
) => {
  const { records, currentAdmin } = context;
  // prioritize revokeBadge
  const verificationStatus = revokeBadge ? false : verified;
  try {
    const projectIds = request?.query?.recordIds
      ?.split(',')
      ?.map(strId => Number(strId)) as number[];
    const projectsBeforeUpdating = await findProjectsByIdArray(projectIds);
    const updateParams = { verified: verificationStatus };

    if (verificationStatus) {
      await Project.query(`
        UPDATE project
        SET "verificationStatus" = NULL
        WHERE id IN (${request?.query?.recordIds})
      `);
    }

    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, updateParams)
      .where('project.id IN (:...ids)')
      .setParameter('ids', projectIds)
      .returning('*')
      .updateEntity(true)
      .execute();

    for (const project of projects.raw) {
      if (
        projectsBeforeUpdating.find(p => p.id === project.id)?.verified ===
        verificationStatus
      ) {
        logger.debug('verifying/unVerifying project but no changes happened', {
          projectId: project.id,
          verificationStatus,
        });
        // if project.verified have not changed, so we should not execute rest of the codes
        continue;
      }
      await Project.addProjectStatusHistoryRecord({
        project,
        status: project.status,
        userId: currentAdmin.id,
        description: verified
          ? HISTORY_DESCRIPTIONS.CHANGED_TO_VERIFIED
          : HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED,
      });
      const projectWithAdmin = (await findProjectById(project.id)) as Project;

      if (revokeBadge) {
        projectWithAdmin.verificationStatus = RevokeSteps.Revoked;
        await projectWithAdmin.save();
        await getNotificationAdapter().projectBadgeRevoked({
          project: projectWithAdmin,
        });
      } else if (verificationStatus) {
        await getNotificationAdapter().projectVerified({
          project: projectWithAdmin,
        });
      } else {
        await getNotificationAdapter().projectUnVerified({
          project: projectWithAdmin,
        });
      }

      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (verificationForm) {
        if (verificationStatus) {
          await makeFormVerified({
            formId: verificationForm.id,
            adminId: currentAdmin.id,
          });
        } else {
          await makeFormDraft({
            formId: verificationForm.id,
            adminId: currentAdmin.id,
          });
        }
      }
    }

    await Promise.all([
      refreshUserProjectPowerView(),
      refreshProjectPowerView(),
      refreshProjectFuturePowerView(),
    ]);
  } catch (error) {
    logger.error('verifyProjects() error', error);
    throw error;
  }
  return {
    redirectUrl: '/admin/resources/Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: `Project(s) successfully ${
        verificationStatus ? 'verified' : 'unverified'
      }`,
      type: 'success',
    },
  };
};

export const updateStatusOfProjects = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  status,
) => {
  const { records, currentAdmin } = context;
  const projectIds = request?.query?.recordIds
    ?.split(',')
    ?.map(strId => Number(strId)) as number[];
  const projectsBeforeUpdating = await findProjectsByIdArray(projectIds);
  const projectStatus = await ProjectStatus.findOne({
    where: { id: status },
  });
  if (projectStatus) {
    const updateData: any = { status: projectStatus };
    if (status === ProjStatus.cancelled || status === ProjStatus.deactive) {
      updateData.verified = false;
      updateData.listed = false;
      updateData.reviewStatus = ReviewStatus.NotListed;
    }
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, updateData)
      .where('project.id IN (:...ids)')
      .setParameter('ids', projectIds)
      .returning('*')
      .updateEntity(true)
      .execute();

    for (const project of projects.raw) {
      if (
        projectsBeforeUpdating.find(p => p.id === project.id)?.statusId ===
        projectStatus.id
      ) {
        logger.debug('Changing project status but no changes happened', {
          projectId: project.id,
          projectStatus,
        });
        // if project.listed have not changed, so we should not execute rest of the codes
        continue;
      }
      await Project.addProjectStatusHistoryRecord({
        project,
        status: projectStatus,
        userId: currentAdmin.id,
      });
      const projectWithAdmin = (await findProjectById(project.id)) as Project;
      if (status === ProjStatus.cancelled) {
        await getNotificationAdapter().projectCancelled({
          project: projectWithAdmin,
        });
        await changeUserBoostingsAfterProjectCancelled({
          projectId: project.id,
        });
      } else if (status === ProjStatus.active) {
        await getNotificationAdapter().projectReactivated({
          project: projectWithAdmin,
        });
      } else if (status === ProjStatus.deactive) {
        await getNotificationAdapter().projectDeactivated({
          project: projectWithAdmin,
        });
      }
    }
    await Promise.all([
      refreshUserProjectPowerView(),
      refreshProjectFuturePowerView(),
      refreshProjectPowerView(),
    ]);
  }
  return {
    redirectUrl: '/admin/resources/Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
      type: 'success',
    },
  };
};

function convertToCSV(data) {
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => JSON.stringify(row[header] || '')).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export const exportEmails = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
) => {
  const { records, currentAdmin } = context;
  const projectIds = request?.query?.recordIds
    ?.split(',')
    ?.map(strId => Number(strId)) as number[];
  const projects = await Project.createQueryBuilder('project')
    .select(['project.title'])
    .leftJoin('project.adminUser', 'adminUser')
    .addSelect('adminUser.email')
    .where('project.id IN (:...ids)', { ids: projectIds })
    .getMany();
  const data = projects.map(p => ({
    title: p.title,
    email: p.adminUser.email,
  }));
  const csv = convertToCSV(data);
  const filePath = path.join(__dirname, 'exports', 'emails.csv');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, csv);
  return {
    redirectUrl: `/admin/download/${path.basename(filePath)}`,
    records: records.map(record => record.toJSON(currentAdmin)),
    notice: {
      message: 'Refresh the page to download the file!',
      type: 'success',
    },
  };
};

export const addProjectsToQfRound = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  add: boolean = true,
) => {
  const { records } = context;
  let message = messages.PROJECTS_RELATED_TO_ACTIVE_QF_ROUND_SUCCESSFULLY;
  const projectIds = request?.query?.recordIds
    ?.split(',')
    ?.map(strId => Number(strId)) as number[];
  const qfRound = await findActiveQfRound(true);
  if (qfRound) {
    await relateManyProjectsToQfRound({
      projectIds,
      qfRound,
      add,
    });
    await refreshProjectEstimatedMatchingView();
  } else {
    message = messages.THERE_IS_NOT_ANY_ACTIVE_QF_ROUND;
  }
  return {
    redirectUrl: '/admin/resources/Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message,
      type: 'success',
    },
  };
};

export const addSingleProjectToQfRound = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  add: boolean = true,
) => {
  const { record, currentAdmin } = context;
  let message = messages.PROJECTS_RELATED_TO_ACTIVE_QF_ROUND_SUCCESSFULLY;
  const projectId = Number(request?.params?.recordId);
  const qfRound = await findActiveQfRound(true);
  if (qfRound) {
    await relateManyProjectsToQfRound({
      projectIds: [projectId],
      qfRound,
      add,
    });

    await refreshProjectEstimatedMatchingView();
  } else {
    message = messages.THERE_IS_NOT_ANY_ACTIVE_QF_ROUND;
  }
  return {
    record: record.toJSON(currentAdmin),
    notice: {
      message,
      type: 'success',
    },
  };
};

export const fillSocialProfileAndQfRounds: After<
  ActionResponse
> = async response => {
  const record: RecordJSON = response.record || {};
  // both cases for projectVerificationForms and projects' ids
  const projectId = record.params.projectId || record.params.id;

  const socials = await findSocialProfilesByProjectId({ projectId });
  const projectUpdates = await findProjectUpdatesByProjectId(projectId);
  const project = await findProjectById(projectId);
  const adminJsBaseUrl = process.env.SERVER_URL;
  let categories;
  if (project) {
    const categoryIds = project!.categories.map(cat => cat.id);
    categories = await Category
            .createQueryBuilder('category')
            .where('category.id IN (:...ids)', { ids: categoryIds })
            .orderBy('category.name', 'ASC')
            .getMany();
  }
  response.record = {
    ...record,
    params: {
      ...record.params,
      projectUrl: `${process.env.GIVETH_IO_DAPP_BASE_URL}/project/${
        project!.slug
      }`,
      socials,
      qfRounds: project?.qfRounds,
      projectUpdates,
      adminJsBaseUrl,
    },
  };

  if (categories) {
    response.record.params.categories = categories.map(cat => `${cat.id} - ${cat.name}`);
  }
  return response;
};

const sendProjectsToGoogleSheet = async (
  projects: Project[],
): Promise<void> => {
  const spreadsheet = await initExportSpreadsheet();

  // parse data and set headers
  const projectRows = projects.map((project: Project) => {
    const projectAddresses = project.addresses || [];

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      admin: project.adminUserId,
      creationDate: project.creationDate,
      updatedAt: project.updatedAt,
      impactLocation: project.impactLocation || '',
      walletAddress: project.walletAddress,
      statusId: project.statusId,
      qualityScore: project.qualityScore,
      verified: Boolean(project.verified),
      listed: Boolean(project.listed),
      reviewStatus: project.reviewStatus,
      totalDonations: project.totalDonations,
      totalProjectUpdates: project.totalProjectUpdates,
      website: project.website || '',
      email: project?.adminUser?.email || '',
      firstWalletAddress: projectAddresses![0]?.address,
      firstWalletAddressNetwork:
        NETWORKS_IDS_TO_NAME[projectAddresses![0]?.networkId] || '',
      secondWalletAddress: projectAddresses![1]?.address || '',
      secondWalletAddressNetwork:
        NETWORKS_IDS_TO_NAME[projectAddresses![1]?.networkId] || '',
    };
  });

  await addProjectsSheetToSpreadsheet(spreadsheet, projectHeaders, projectRows);
};

export const listDelist = async (
  context: AdminJsContextInterface,
  request,
  reviewStatus: ReviewStatus = ReviewStatus.Listed,
) => {
  const { records, currentAdmin } = context;
  let listed;
  switch (reviewStatus) {
    case ReviewStatus.Listed:
      listed = true;
      break;
    case ReviewStatus.NotListed:
      listed = false;
      break;
    case ReviewStatus.NotReviewed:
      listed = null;
      break;
    default:
  }
  try {
    const projectIds = request?.query?.recordIds
      ?.split(',')
      ?.map(strId => Number(strId)) as number[];
    const projectsBeforeUpdating = await findProjectsByIdArray(projectIds);
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, { reviewStatus, listed })
      .where('project.id IN (:...ids)')
      .setParameter('ids', projectIds)
      .returning('*')
      .updateEntity(true)
      .execute();
    for (const project of projects.raw) {
      if (
        projectsBeforeUpdating.find(p => p.id === project.id)?.reviewStatus ===
        reviewStatus
      ) {
        logger.debug('listing/uListing project but no changes happened', {
          projectId: project.id,
          reviewStatus,
        });
        // if project.listed have not changed, so we should not execute rest of the codes
        continue;
      }
      await Project.addProjectStatusHistoryRecord({
        project,
        status: project.status,
        userId: currentAdmin.id,
        description:
          reviewStatus === ReviewStatus.Listed
            ? HISTORY_DESCRIPTIONS.CHANGED_TO_LISTED
            : HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
      });
      const projectWithAdmin = (await findProjectById(project.id)) as Project;
      if (reviewStatus === ReviewStatus.Listed) {
        await getNotificationAdapter().projectListed({
          project: projectWithAdmin,
        });
      } else {
        await getNotificationAdapter().projectDeListed({
          project: projectWithAdmin,
        });
      }
    }
  } catch (error) {
    logger.error('listDelist error', error);
    throw error;
  }
  return {
    redirectUrl: '/admin/resources/Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: `Project(s) review status successfully changed to ${reviewStatus}`,
      type: 'success',
    },
  };
};

export const exportProjectsWithFiltersToCsv = async (
  _request,
  _response,
  context: AdminJsContextInterface,
) => {
  try {
    const { records } = context;
    const queryStrings = extractAdminJsReferrerUrlParams(_request);
    const projectsQuery = buildProjectsQuery(queryStrings);
    const projects = await projectsQuery.getMany();

    await sendProjectsToGoogleSheet(projects);

    return {
      redirectUrl: '/admin/resources/Project',
      records,
      notice: {
        message: `Project(s) successfully exported`,
        type: 'success',
      },
    };
  } catch (e) {
    logger.error('exportProjectsWithFiltersToCsv() error', e);
    return {
      redirectUrl: '/admin/resources/Project',
      record: {},
      notice: {
        message: e.message,
        type: 'danger',
      },
    };
  }
};
export const projectsTab = {
  resource: Project,
  options: {
    properties: {
      id: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
        },
      },
      changeId: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      updatedAt: {
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      sumDonationValueUsdForActiveQfRound: {
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      countUniqueDonorsForActiveQfRound: {
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      countUniqueDonors: {
        isVisible: { list: false, filter: false, show: true, edit: false },
      },
      organizationId: {
        isVisible: { list: false, filter: true, show: true, edit: true },
      },
      statusId: {
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      socials: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        components: {
          show: adminJs.bundle('./components/VerificationFormSocials'),
        },
      },
      adminUserId: {
        type: 'Number',
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: true,
          new: false,
        },
        position: 1,
      },
      contacts: {
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
          new: false,
        },
      },
      qualityScore: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      verified: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      verificationStatus: {
        availableValues: [
          { value: 'reminder', label: 'Reminder' },
          { value: 'warning', label: 'Warning' },
          { value: 'lastChance', label: 'Last Chance' },
          { value: 'upForRevoking', label: 'Ready for Revoking' },
          { value: 'revoked', label: 'Revoked' },
        ],
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: true,
          new: false,
        },
      },
      totalDonations: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      totalTraceDonations: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },

      description: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
        },
      },
      slug: {
        isVisible: { list: true, filter: true, show: true, edit: true },
      },
      projectUrl: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },

        components: {
          show: adminJs.bundle('./components/ClickableLink'),
        },
      },
      organisationId: {
        isVisible: false,
      },
      coOrdinates: {
        isVisible: false,
      },
      image: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      givingBlocksId: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      traceCampaignId: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      website: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      youtube: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      balance: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      totalProjectUpdates: {
        isVisible: false,
      },
      giveBacks: {
        isVisible: false,
      },
      stripeAccountId: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      categoryIds: {
        type: 'reference',
        isArray: true,
        reference: 'Category',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
        },
        availableValues: async (_record) => {
          const categories = await Category
            .createQueryBuilder('category')
            .where('category.isActive = :isActive', { isActive: true })
            .orderBy('category.name', 'ASC')
            .getMany();          
          return categories.map(category => ({
            value: category.id,
            label: `${category.id} - ${category.name}`,
          }));
        },
      },
      isImported: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: true,
        },
      },
      totalReactions: {
        isVisible: false,
      },
      walletAddress: {
        isVisible: { list: false, filter: true, show: true, edit: true },
      },
      impactLocation: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      descriptionSummary: {
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      slugHistory: {
        isVisible: false,
      },
      addresses: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        components: {
          show: adminJs.bundle('./components/ListProjectAddresses'),
        },
      },
      listed: {
        isVisible: false,
        // components: {
        //   filter: adminJs.bundle('./components/FilterListedComponent'),
        // },
      },
      reviewStatus: {
        isVisible: {
          show: true,
          list: true,
          edit: true,
          filter: true,
        },
      },
      projectUpdates: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
        components: {
          show: adminJs.bundle('./components/ProjectUpdates'),
        },
      },
      qfRounds: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
        components: {
          show: adminJs.bundle('./components/QfRoundsInProject'),
        },
      },
      adminJsBaseUrl: {
        type: 'string',
        isVisible: {
          list: false,
          filter: false,
          show: false,
          edit: false,
        },
      },
    },
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction({ currentAdmin }, ResourceActions.NEW),
        before: async (request) => {
          if (request.payload.categories) {
            request.payload.categories = (request.payload.categories as string[]).map(id => ({ id: parseInt(id, 10) }));
          }
          return request;
        },
        after: async (response) => {
          const { record, request } = response;
          if (request.payload.categoryIds) {
            await saveCategories(record.params.id, request.payload.categoryIds);
          }
          return response;
        },
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction({ currentAdmin }, ResourceActions.BULK_DELETE),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction({ currentAdmin }, ResourceActions.SHOW),
        after: fillSocialProfileAndQfRounds,
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction({ currentAdmin }, ResourceActions.EDIT),

        before: async (request: AdminJsRequestInterface) => {
          const { verified, reviewStatus } = request.payload;
          const statusChanges: string[] = [];
          if (request?.payload?.id) {
            // remove addresses from payload to avoid updating them
            for (const key in request.payload) {
              if (key.includes('addresses')) {
                delete request.payload[key];
              }
            }

            const project = await findProjectById(Number(request.payload.id));
            if (
              project &&
              Number(request?.payload?.statusId) !== project?.status?.id
            ) {
              switch (Number(request?.payload?.statusId)) {
                case ProjStatus.active:
                  statusChanges.push(
                    NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED,
                  );
                  break;
                case ProjStatus.deactive:
                  statusChanges.push(
                    NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
                  );
                  break;
                case ProjStatus.cancelled:
                  statusChanges.push(
                    NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
                  );
                  break;
              }
            }
            if (project?.verified && !verified) {
              statusChanges.push(NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED);
            }
            if (!project?.verified && verified) {
              statusChanges.push(NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED);
            }
            if (
              project?.reviewStatus === ReviewStatus.Listed &&
              reviewStatus === ReviewStatus.NotListed
            ) {
              statusChanges.push(NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED);
            }
            if (
              project?.reviewStatus !== ReviewStatus.Listed &&
              reviewStatus === ReviewStatus.Listed
            ) {
              statusChanges.push(NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED);
            }
            if (
              project &&
              (project?.reviewStatus === ReviewStatus.Listed ||
                project?.reviewStatus === ReviewStatus.NotListed) &&
              reviewStatus === ReviewStatus.NotReviewed
            ) {
              statusChanges.push(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_NOT_REVIEWED,
              );
            }

            if (
              Number(request?.payload?.adminUserId) !== project?.adminUserId
            ) {
              const newID = request?.payload?.adminUserId;
              request.payload.adminChanged = true;
              request.payload.newAdminId = newID;
            }

            // We put these status changes in payload, so in after hook we would know to send notification for users
            request.payload.statusChanges = statusChanges.join(',');
          }
          if (request.payload.categories) {
            request.payload.categories = (request.payload.categories as string[]).map(id => ({ id: parseInt(id, 10) }));
          }
          return request;
        },
        after: async (
          request: AdminJsRequestInterface,
          response,
          context: AdminJsContextInterface,
        ) => {
          const { currentAdmin } = context;
          const project = await Project.findOne({
            where: { id: request?.record?.id },
          });
          if (project) {
            if (request?.record?.params?.adminChanged) {
              const adminUser = await User.findOne({
                where: { id: request?.record?.params?.newAdminId },
              });
              project.adminUser = adminUser!;
              await project.save();
            }
            // Not required for now
            // Project.notifySegment(project, SegmentEvents.PROJECT_EDITED);

            // As we don't want fields be changed (listed, verified, ..), I just added new status and a description that project has been edited
            await Project.addProjectStatusHistoryRecord({
              project,
              status: project.status,
              userId: currentAdmin.id,
              description: HISTORY_DESCRIPTIONS.HAS_BEEN_EDITED,
            });
            const statusChanges =
              request?.record?.params?.statusChanges?.split(',') || [];

            const eventAndHandlers = [
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED,
                handler: getNotificationAdapter().projectVerified,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED,
                handler: getNotificationAdapter().projectUnVerified,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED,
                handler: getNotificationAdapter().projectListed,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,
                handler: getNotificationAdapter().projectDeListed,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_ACTIVATED,
                handler: getNotificationAdapter().projectReactivated,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_DEACTIVATED,
                handler: getNotificationAdapter().projectDeactivated,
              },
              {
                event: NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
                handler: getNotificationAdapter().projectCancelled,
              },
            ];

            eventAndHandlers.forEach(eventHandler => {
              if (statusChanges?.includes(eventHandler.event)) {
                // Don't put await before that intentionally to not block admin panel response with that
                eventHandler.handler({ project });
              }
            });

            if (
              statusChanges?.includes(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_VERIFIED,
              )
            ) {
              const verificationForm = await getVerificationFormByProjectId(
                project.id,
              );
              if (verificationForm) {
                await makeFormVerified({
                  formId: verificationForm.id,
                  adminId: currentAdmin.id,
                });
              }
            }

            if (
              statusChanges?.includes(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_UNVERIFIED,
              )
            ) {
              const verificationForm = await getVerificationFormByProjectId(
                project.id,
              );
              if (verificationForm) {
                await makeFormDraft({
                  formId: verificationForm.id,
                  adminId: currentAdmin.id,
                });
              }
            }

            if (
              statusChanges?.includes(NOTIFICATIONS_EVENT_NAMES.PROJECT_LISTED)
            ) {
              project.listed = true;
              await project.save();
            }

            if (
              statusChanges?.includes(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_UNLISTED,
              )
            ) {
              project.listed = false;
              await project.save();
            }

            if (
              statusChanges?.includes(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_NOT_REVIEWED,
              )
            ) {
              project.listed = null;
              await project.save();
            }

            if (
              statusChanges?.includes(
                NOTIFICATIONS_EVENT_NAMES.PROJECT_CANCELLED,
              )
            ) {
              await changeUserBoostingsAfterProjectCancelled({
                projectId: project.id,
              });
            }
          }
          await Promise.all([
            refreshUserProjectPowerView(),
            refreshProjectFuturePowerView(),
            refreshProjectPowerView(),
            saveCategories(project!.id, request?.payload?.categoryIds || [])
          ]);
          return request;
        },
      },
      exportFilterToCsv: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.EXPORT_FILTER_TO_CSV,
          ),
        handler: exportProjectsWithFiltersToCsv,
        component: false,
      },
      listProject: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.LIST_PROJECT,
          ),
        handler: async (request, response, context) => {
          return listDelist(context, request, ReviewStatus.Listed);
        },
        component: false,
      },
      unlist: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.UNLIST_PROJECT,
          ),
        handler: async (request, response, context) => {
          return listDelist(context, request, ReviewStatus.NotListed);
        },
        component: false,
      },
      verify: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.VERIFY_PROJECT,
          ),
        handler: async (request, response, context) => {
          return verifyProjects(context, request, true);
        },
        component: false,
      },
      reject: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.REJECT_PROJECT,
          ),
        handler: async (request, response, context) => {
          return verifyProjects(context, request, false);
        },
        component: false,
      },
      // the difference is that it sends another segment event
      revokeBadge: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.REVOKE_BADGE,
          ),
        handler: async (request, response, context) => {
          return verifyProjects(context, request, false, true);
        },
        component: false,
      },
      activate: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.ACTIVATE_PROJECT,
          ),
        handler: async (request, response, context) => {
          return updateStatusOfProjects(context, request, ProjStatus.active);
        },
        component: false,
      },
      deactivate: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.DEACTIVATE_PROJECT,
          ),
        handler: async (request, response, context) => {
          return updateStatusOfProjects(context, request, ProjStatus.deactive);
        },
        component: false,
      },
      cancel: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.CANCEL_PROJECT,
          ),
        handler: async (request, response, context) => {
          return updateStatusOfProjects(context, request, ProjStatus.cancelled);
        },
        component: false,
      },

      addProjectToQfRound: {
        // https://docs.adminjs.co/basics/action#record-type-actions
        actionType: 'record',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.ADD_PROJECT_TO_QF_ROUND,
          ),
        guard: 'Do you want to add this project to current active qf round?',
        handler: async (request, response, context) => {
          return addSingleProjectToQfRound(context, request, true);
        },
        component: false,
      },
      removeProjectFromQfRound: {
        // https://docs.adminjs.co/basics/action#record-type-actions
        actionType: 'record',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.ADD_PROJECT_TO_QF_ROUND,
          ),
        guard:
          'Do you want to remove this project from current active qf round?',
        handler: async (request, response, context) => {
          return addSingleProjectToQfRound(context, request, false);
        },
        component: false,
      },

      addToQfRound: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.ADD_PROJECT_TO_QF_ROUND,
          ),
        handler: async (request, response, context) => {
          return addProjectsToQfRound(context, request, true);
        },
        component: false,
      },
      removeFromQfRound: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.ADD_PROJECT_TO_QF_ROUND,
          ),
        handler: async (request, response, context) => {
          return addProjectsToQfRound(context, request, false);
        },
        component: false,
      },
      exportEmails: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.EXPORT_EMAILS,
          ),
        handler: async (request, _response, context) => {
          return exportEmails(context, request);
        },
        component: false,
      },
    },
  },
};

async function saveCategories(projectId: number, categoryIds: string[]) {
  if (categoryIds?.length === 0) return;
  
  const project = await Project
    .createQueryBuilder('project')
    .leftJoinAndSelect('project.categories', 'category')
    .where('project.id = :id', { id: projectId })
    .getOne();

  if (!project) {
    throw new Error('Project not found');
  }

  const categories = await Category
    .createQueryBuilder('category')
    .where('category.id IN (:...ids)', { ids: categoryIds })
    .getMany();

  project.categories = categories;
  await project.save();
}
