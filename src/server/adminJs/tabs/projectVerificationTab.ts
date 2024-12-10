import adminJs from 'adminjs';
import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import {
  ActionResponse,
  After,
} from 'adminjs/src/backend/actions/action.interface';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../../../entities/projectVerificationForm';
import {
  canAccessProjectAction,
  canAccessProjectVerificationFormAction,
  ResourceActions,
} from '../adminJsPermissions';

import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';
import {
  approveMultipleProjects,
  approveProject,
  findProjectVerificationFormById,
  getVerificationFormByProjectId,
  makeFormDraft,
  verifyForm,
  verifyMultipleForms,
} from '../../../repositories/projectVerificationRepository';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import {
  findProjectById,
  updateProjectWithVerificationForm,
} from '../../../repositories/projectRepository';
import { getNotificationAdapter } from '../../../adapters/adaptersFactory';
import { logger } from '../../../utils/logger';
import { Project, RevokeSteps } from '../../../entities/project';
import { fillSocialProfileAndQfRounds } from './projectsTab';
import { refreshUserProjectPowerView } from '../../../repositories/userProjectPowerViewRepository';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../../../repositories/projectPowerViewRepository';

const extractLastComment = (verificationForm: ProjectVerificationForm) => {
  const commentsSorted = verificationForm.commentsSection?.comments?.sort(
    (a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    },
  );
  const lastComment =
    commentsSorted &&
    commentsSorted.length > 0 &&
    commentsSorted[commentsSorted.length - 1];
  return lastComment ? lastComment.content : undefined;
};

export const setCommentEmailAndTimeStamps: After<ActionResponse> = async (
  response,
  request,
  context,
) => {
  const { currentAdmin } = context;
  const record: RecordJSON = response.record || {};

  const projectVerificationForm =
    await ProjectVerificationForm.createQueryBuilder()
      .where('id = :id', { id: record.params.id })
      .getOne();

  if (!projectVerificationForm) return response;

  // if none is created, nothing will be updated
  if (projectVerificationForm?.commentsSection?.comments) {
    for (const comment of projectVerificationForm.commentsSection.comments) {
      if (comment.email) continue;
      comment.email = currentAdmin!.email;
      comment.createdAt = new Date();
    }
  }

  await projectVerificationForm.save();
  return response;
};

export const verifySingleVerificationForm = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  approved: boolean,
) => {
  const { currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  const verificationStatus = approved
    ? PROJECT_VERIFICATION_STATUSES.VERIFIED
    : PROJECT_VERIFICATION_STATUSES.REJECTED;
  const formId = Number(request?.params?.recordId);
  const verificationFormInDb = await findProjectVerificationFormById(formId);

  try {
    if (
      approved &&
      ![
        PROJECT_VERIFICATION_STATUSES.REJECTED,
        PROJECT_VERIFICATION_STATUSES.SUBMITTED,
      ].includes(verificationFormInDb?.status as PROJECT_VERIFICATION_STATUSES)
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_JUST_CAN_VERIFY_REJECTED_AND_SUBMITTED_FORMS,
        ),
      );
    }
    if (
      !approved &&
      PROJECT_VERIFICATION_STATUSES.SUBMITTED !== verificationFormInDb?.status
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_JUST_CAN_REJECT_SUBMITTED_FORMS,
        ),
      );
    }

    const verificationForm = await verifyForm({
      verificationStatus,
      formId,
      adminId: currentAdmin.id,
    });
    const projectId = verificationForm.projectId;
    const project = await approveProject({ approved, projectId });

    if (approved) {
      await updateProjectWithVerificationForm(verificationForm, project);
      await getNotificationAdapter().projectVerified({
        project,
      });
    } else {
      const reason = extractLastComment(verificationForm);
      await getNotificationAdapter().verificationFormRejected({
        project,
        reason,
      });
    }

    responseMessage = `Project(s) successfully ${
      approved ? 'approved' : 'rejected'
    }`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseType = 'danger';
    responseMessage = 'Verify/Reject verification form failed ' + error.message;
  }
  const x: RecordJSON = {
    baseError: null,
    id: String(formId),
    title: '',
    bulkActions: [],
    errors: {},
    params: (context as any).record.params,
    populated: (context as any).record.populated,
    recordActions: [],
  };

  return {
    record: x,
    redirectUrl: `/admin/resources/ProjectVerificationForm/ProjectVerificationForm/records`,
    notice: {
      message: responseMessage,
      type: responseType,
    },
  };
};

export const makeEditableByUser = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
) => {
  const { currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  const formId = Number(request?.params?.recordId);
  const verificationFormInDb = await findProjectVerificationFormById(formId);

  try {
    if (
      ![
        PROJECT_VERIFICATION_STATUSES.REJECTED,
        PROJECT_VERIFICATION_STATUSES.SUBMITTED,
      ].includes(verificationFormInDb?.status as PROJECT_VERIFICATION_STATUSES)
    ) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_JUST_CAN_MAKE_DRAFT_REJECTED_AND_SUBMITTED_FORMS,
        ),
      );
    }
    const verificationForm = await makeFormDraft({
      formId,
      adminId: currentAdmin.id,
    });
    const projectId = verificationForm.projectId;
    const project = (await findProjectById(projectId)) as Project;
    await getNotificationAdapter().projectGotDraftByAdmin({ project });

    responseMessage = `Project(s) successfully got draft`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseType = 'danger';
    responseMessage = 'Verify/Reject verification form failed ' + error.message;
  }
  const x: RecordJSON = {
    baseError: null,
    id: String(formId),
    title: '',
    bulkActions: [],
    errors: {},
    params: (context as any).record.params,
    populated: (context as any).record.populated,
    recordActions: [],
  };

  return {
    record: x,
    redirectUrl: `/admin/resources/ProjectVerificationForm/ProjectVerificationForm/records`,
    notice: {
      message: responseMessage,
      type: responseType,
    },
  };
};

export const approveVerificationForms = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
  approved: boolean,
) => {
  const { records, currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  try {
    const verificationStatus = approved
      ? PROJECT_VERIFICATION_STATUSES.VERIFIED
      : PROJECT_VERIFICATION_STATUSES.REJECTED;
    const formIds = request?.query?.recordIds?.split(',');

    logger.info('approveVerificationForms() formIds', formIds);

    // Preliminary check for DRAFT status
    const draftProjects = await ProjectVerificationForm.createQueryBuilder(
      'form',
    )
      .where('form.id IN (:...formIds)', { formIds })
      .andWhere('form.status = :status', {
        status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      })
      .getMany();

    if (draftProjects.length > 0) {
      throw new Error(
        `Cannot ${approved ? 'approve' : 'reject'} project${draftProjects.length > 1 ? 's' : ''} in DRAFT status.`,
      );
    }

    // call repositories
    const projectsForms = await verifyMultipleForms({
      verificationStatus,
      formIds,
      reviewerId: currentAdmin.id,
    });
    const projectsIds = projectsForms.raw.map(projectForm => {
      return projectForm.projectId;
    });
    const projects = await approveMultipleProjects({ approved, projectsIds });

    const projectIds = projects.raw.map(project => {
      return project.id;
    });

    // need to re-query them as the RAW is not an entity
    const verificationForms = await ProjectVerificationForm.createQueryBuilder(
      'projectVerificationForm',
    )
      .innerJoinAndSelect('projectVerificationForm.project', 'project')
      .leftJoinAndSelect('project.adminUser', 'adminUser')
      .where('"projectId" IN (:...ids)')
      .setParameter('ids', projectIds)
      .getMany();

    for (const verificationForm of verificationForms) {
      await updateProjectWithVerificationForm(
        verificationForm,
        verificationForm.project,
      );
      const { project } = verificationForm;
      if (approved) {
        await getNotificationAdapter().projectVerified({
          project,
        });
      } else {
        const reason = extractLastComment(verificationForm);
        await getNotificationAdapter().verificationFormRejected({
          project,
          reason,
        });
      }
    }
    responseMessage = `Project(s) successfully ${
      approved ? 'approved' : 'rejected'
    }`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseMessage = `Bulk verify failed: ${error.message}`;
    responseType = 'danger';
  }
  return {
    redirectUrl: '/admin/resources/ProjectVerificationForm',
    // record: {},
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: responseMessage,
      type: responseType,
    },
  };
};

export const revokeGivbacksEligibility = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
) => {
  const { records, currentAdmin } = context;
  try {
    const projectFormIds = request?.query?.recordIds
      ?.split(',')
      ?.map(strId => Number(strId)) as number[];
    const projectIds: number[] = [];
    for (const formId of projectFormIds) {
      const verificationForm = await findProjectVerificationFormById(formId);
      if (verificationForm) {
        projectIds.push(verificationForm.projectId);
      }
    }
    const updateParams = { isGivbackEligible: false };
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, updateParams)
      .where('project.id IN (:...ids)')
      .setParameter('ids', projectIds)
      .returning('*')
      .updateEntity(true)
      .execute();

    for (const project of projects.raw) {
      const projectWithAdmin = (await findProjectById(project.id)) as Project;
      projectWithAdmin.verificationStatus = RevokeSteps.Revoked;
      await projectWithAdmin.save();
      await getNotificationAdapter().projectBadgeRevoked({
        project: projectWithAdmin,
      });
      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (verificationForm) {
        await makeFormDraft({
          formId: verificationForm.id,
          adminId: currentAdmin.id,
        });
      }
    }
    await Promise.all([
      refreshUserProjectPowerView(),
      refreshProjectPowerView(),
      refreshProjectFuturePowerView(),
    ]);
  } catch (error) {
    logger.error('revokeGivbacksEligibility() error', error);
    throw error;
  }
  return {
    redirectUrl: '/admin/resources/ProjectVerificationForm',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: 'Project(s) successfully revoked from Givbacks eligibility',
      type: 'success',
    },
  };
};

export const projectVerificationTab = {
  resource: ProjectVerificationForm,
  options: {
    sort: {
      direction: 'desc',
      sortBy: 'updatedAt',
    },
    filter: {},
    properties: {
      id: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      status: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: true,
        },
      },
      lastStep: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      projectId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      reviewerId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      userId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      createdAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      updatedAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      verifiedAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      email: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
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
      personalInfo: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      'personalInfo.fullName': { type: 'string' },
      'personalInfo.walletAddress': { type: 'string' },
      'personalInfo.email': { type: 'string' },
      projectRegistry: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        components: {
          show: adminJs.bundle('./components/VerificationFormProjectRegistry'),
        },
      },
      'projectRegistry.isNonProfitOrganization': { type: 'boolean' },
      'projectRegistry.organizationCountry': { type: 'string' },
      'projectRegistry.organizationWebsite': { type: 'string' },
      'projectRegistry.organizationDescription': { type: 'string' },
      'projectRegistry.organizationName': { type: 'string' },
      'projectRegistry.attachment': { type: 'string' },
      projectContacts: {
        type: 'mixed',
        isArray: true,
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      'projectContacts.name': { type: 'string' },
      'projectContacts.url': { type: 'string' },
      milestones: {
        // type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
        components: {
          show: adminJs.bundle('./components/VerificationFormMilestones'),
        },
      },
      managingFunds: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      'managingFunds.description': { type: 'string' },
      'managingFunds.relatedAddresses': { type: 'mixed', isArray: true },
      'managingFunds.relatedAddresses.title': { type: 'string' },
      'managingFunds.relatedAddresses.address': { type: 'string' },
      'managingFunds.relatedAddresses.networkId': { type: 'integer' },
      commentsSection: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
      },
      'commentsSection.comments': { type: 'mixed', isArray: true },
      'commentsSection.comments.email': {
        type: 'string',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: true,
        },
      },
      'commentsSection.comments.content': {
        type: 'string',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
      },
      'commentsSection.comments.createdAt': {
        type: 'date',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      emailConfirmed: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      emailConfirmationTokenExpiredAt: {
        isVisible: false,
      },
      emailConfirmationToken: {
        isVisible: false,
      },
      emailConfirmationSent: {
        isVisible: false,
      },
      emailConfirmationSentAt: {
        isVisible: false,
      },
      emailConfirmedAt: {
        isVisible: false,
      },
      isTermAndConditionsAccepted: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },
    actions: {
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
        isVisible: true,
        after: setCommentEmailAndTimeStamps,
      },
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.LIST,
          ),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.SHOW,
          ),
        after: fillSocialProfileAndQfRounds,
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
      approveProject: {
        actionType: 'record',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.APPROVE_PROJECT,
          ),
        handler: async (request, response, context) => {
          return verifySingleVerificationForm(context, request, true);
        },
        component: false,
      },
      makeEditableByUser: {
        actionType: 'record',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.MAKE_EDITABLE_BY_USER,
          ),
        handler: async (request, response, context) => {
          return makeEditableByUser(context, request);
        },
        component: false,
      },
      rejectProject: {
        actionType: 'record',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.REJECT_PROJECT,
          ),
        handler: async (request, response, context) => {
          return verifySingleVerificationForm(context, request, false);
        },
        component: false,
      },
      approveProjects: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.APPROVE_PROJECTS,
          ),
        handler: async (request, response, context) => {
          return approveVerificationForms(context, request, true);
        },
        component: false,
      },
      rejectProjects: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectVerificationFormAction(
            { currentAdmin },
            ResourceActions.REJECT_PROJECTS,
          ),
        handler: async (request, response, context) => {
          return approveVerificationForms(context, request, false);
        },
        component: false,
      },
      revokeGivbacksEligible: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAction(
            { currentAdmin },
            ResourceActions.REVOKE_BADGE,
          ),
        handler: async (request, _response, context) => {
          return revokeGivbacksEligibility(context, request);
        },
        component: false,
      },
    },
  },
};
