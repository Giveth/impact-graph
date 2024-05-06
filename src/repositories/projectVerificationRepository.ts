import { UpdateResult } from 'typeorm';
import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PersonalInfo,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
  PROJECT_VERIFICATION_STEPS,
} from '../entities/projectVerificationForm';
import { findProjectById } from './projectRepository';
import { findUserById } from './userRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { User } from '../entities/user';
import { getAppropriateNetworkId } from '../services/chains';
import { logger } from '../utils/logger';

export const createProjectVerificationForm = async (params: {
  userId: number;
  projectId: number;
}): Promise<ProjectVerificationForm> => {
  const { userId, projectId } = params;
  const project = await findProjectById(projectId);
  const user = await findUserById(userId);
  return ProjectVerificationForm.create({
    project,
    user,
  } as ProjectVerificationForm).save();
};

export const updateProjectVerificationFormStatusOnly = async (
  projectVerificationFormId: number,
  verificationStatus: PROJECT_VERIFICATION_STATUSES,
  reviewerId?: number,
): Promise<ProjectVerificationForm | void> => {
  const form = await findProjectVerificationFormById(projectVerificationFormId);

  if (!form) return;

  form.status = verificationStatus;
  if (reviewerId) form.reviewerId = reviewerId;
  return form.save();
};

export const verifyMultipleForms = async (params: {
  verificationStatus: PROJECT_VERIFICATION_STATUSES;
  formIds?: number[] | string[];
  reviewerId?: number;
}): Promise<UpdateResult> => {
  const updateParams = {
    status: params.verificationStatus,
    verifiedAt: new Date(),
  };

  if (params.reviewerId) {
    const key = 'reviewerId';
    updateParams[key] = params.reviewerId;
  }

  return ProjectVerificationForm.createQueryBuilder()
    .update<ProjectVerificationForm>(ProjectVerificationForm, updateParams)
    .where('id IN (:...ids)')
    .setParameter('ids', params.formIds)
    .returning('*')
    .updateEntity(true)
    .execute();
};

export const verifyForm = async (params: {
  verificationStatus: PROJECT_VERIFICATION_STATUSES;
  formId: number;
  adminId: number;
}): Promise<ProjectVerificationForm> => {
  const form = await ProjectVerificationForm.createQueryBuilder()
    .where('id = :id', { id: params.formId })
    .getOne();

  if (!form)
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );

  form.status = params.verificationStatus;
  form.reviewer = (await findUserById(params.adminId)) as User;
  form.verifiedAt = new Date();
  return form.save();
};

export const makeFormDraft = async (params: {
  formId: number;
  adminId?: number;
}): Promise<ProjectVerificationForm> => {
  const form = await ProjectVerificationForm.createQueryBuilder()
    .where('id = :id', { id: params.formId })
    .getOne();

  if (!form)
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );

  form.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
  form.lastStep = PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS;
  form.isTermAndConditionsAccepted = false;
  if (params.adminId) {
    form.reviewer = (await findUserById(params.adminId)) as User;
  }
  return form.save();
};

export const makeFormVerified = async (params: {
  formId: number;
  adminId?: number;
}): Promise<ProjectVerificationForm> => {
  const form = await ProjectVerificationForm.createQueryBuilder()
    .where('id = :id', { id: params.formId })
    .getOne();

  if (!form)
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );

  form.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
  form.lastStep = PROJECT_VERIFICATION_STEPS.SUBMIT;
  form.isTermAndConditionsAccepted = true;
  form.verifiedAt = new Date();

  if (params.adminId) {
    form.reviewer = (await findUserById(params.adminId)) || undefined;
  }
  return form.save();
};

export const findProjectVerificationFormById = async (
  projectVerificationId: number,
): Promise<ProjectVerificationForm | null> => {
  return ProjectVerificationForm.createQueryBuilder('project_verification_form')
    .where({
      id: projectVerificationId,
    })
    .leftJoinAndSelect(
      'project_verification_form.socialProfiles',
      'socialProfiles',
    )
    .leftJoinAndSelect('project_verification_form.project', 'project')
    .leftJoinAndSelect('project_verification_form.user', 'user')
    .getOne();
};

export const findProjectVerificationFormByEmailConfirmationToken = async (
  emailConfirmationToken: string,
): Promise<ProjectVerificationForm | null> => {
  return ProjectVerificationForm.createQueryBuilder('project_verification_form')
    .where({
      emailConfirmationToken,
    })
    .leftJoinAndSelect(
      'project_verification_form.socialProfiles',
      'socialProfiles',
    )
    .leftJoinAndSelect('project_verification_form.project', 'project')
    .leftJoinAndSelect('project_verification_form.user', 'user')
    .getOne();
};

export const updateProjectPersonalInfoOfProjectVerification = async (params: {
  projectVerificationId: number;
  personalInfo: PersonalInfo;
}): Promise<ProjectVerificationForm> => {
  try {
    const { personalInfo, projectVerificationId } = params;
    const projectVerificationForm = await findProjectVerificationFormById(
      projectVerificationId,
    );
    logger.debug('updateProjectPersonalInfoOfProjectVerification: ', {
      params,
      projectVerificationForm,
    });
    if (!projectVerificationForm) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
        ),
      );
    }

    projectVerificationForm.personalInfo = personalInfo;
    return projectVerificationForm?.save();
  } catch (error) {
    logger.debug(
      'updateProjectPersonalInfoOfProjectVerification error: ',
      error,
    );
    throw new Error(error);
  }
};

export const updateProjectRegistryOfProjectVerification = async (params: {
  projectVerificationId: number;
  projectRegistry: ProjectRegistry;
}): Promise<ProjectVerificationForm> => {
  const { projectRegistry, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }

  projectVerificationForm.projectRegistry = projectRegistry;
  return projectVerificationForm?.save();
};

export const updateProjectVerificationStatus = async (params: {
  projectVerificationId: number;
  status: PROJECT_VERIFICATION_STATUSES;
}): Promise<ProjectVerificationForm> => {
  const { status, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }

  projectVerificationForm.status = status;
  return projectVerificationForm?.save();
};

export const updateProjectVerificationLastStep = async (params: {
  projectVerificationId: number;
  lastStep: string | null;
}): Promise<ProjectVerificationForm> => {
  const { lastStep, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }

  projectVerificationForm.lastStep = lastStep;
  return projectVerificationForm?.save();
};

export const updateProjectContactsOfProjectVerification = async (params: {
  projectVerificationId: number;
  projectContacts: ProjectContacts[];
}): Promise<ProjectVerificationForm> => {
  const { projectContacts, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }
  // const projectContacts2 = new ProjectContacts()
  // projectContacts2.linkedin = projectContacts.linkedin
  projectVerificationForm.projectContacts = projectContacts;
  return await projectVerificationForm.save();
};
export const updateMilestonesOfProjectVerification = async (params: {
  projectVerificationId: number;
  milestones: Milestones;
}): Promise<ProjectVerificationForm> => {
  const { milestones, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }
  projectVerificationForm.milestones = milestones;
  return await projectVerificationForm?.save();
};
export const updateTermsAndConditionsOfProjectVerification = async (params: {
  projectVerificationId: number;
  isTermAndConditionsAccepted: boolean;
}): Promise<ProjectVerificationForm> => {
  const { isTermAndConditionsAccepted, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }
  projectVerificationForm.isTermAndConditionsAccepted =
    isTermAndConditionsAccepted;
  return await projectVerificationForm?.save();
};

export const updateManagingFundsOfProjectVerification = async (params: {
  projectVerificationId: number;
  managingFunds: ManagingFunds;
}): Promise<ProjectVerificationForm> => {
  const { managingFunds, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND),
    );
  }

  managingFunds.relatedAddresses = managingFunds.relatedAddresses.map(
    address => {
      // because frontend sends 0 for solana addresses
      address.networkId = getAppropriateNetworkId({
        networkId: address.networkId,
        chainType: address.chainType,
      });

      return address;
    },
  );
  projectVerificationForm.managingFunds = managingFunds;
  return projectVerificationForm?.save();
};

export const getVerificationFormByProjectId = async (
  projectId: number,
): Promise<ProjectVerificationForm | null> => {
  return ProjectVerificationForm.createQueryBuilder('project_verification_form')
    .where(`project_verification_form.projectId=:projectId`, {
      projectId,
    })
    .leftJoinAndSelect('project_verification_form.project', 'project')
    .leftJoinAndSelect('project.status', 'status')
    .leftJoinAndSelect(
      'project_verification_form.socialProfiles',
      'socialProfiles',
    )
    .leftJoinAndSelect('project_verification_form.user', 'user')
    .getOne();
};
