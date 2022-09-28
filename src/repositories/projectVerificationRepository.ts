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
import { UpdateResult } from 'typeorm';
import { errorMessages } from '../utils/errorMessages';

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
  }).save();
};

export const verifyMultipleForms = async (params: {
  verificationStatus: PROJECT_VERIFICATION_STATUSES;
  formIds?: number[] | string[];
}): Promise<UpdateResult> => {
  return ProjectVerificationForm.createQueryBuilder()
    .update<ProjectVerificationForm>(ProjectVerificationForm, {
      status: params.verificationStatus,
    })
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

  if (!form) throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);

  form.status = params.verificationStatus;
  form.reviewer = await findUserById(params.adminId);
  return form.save();
};

export const makeFormDraft = async (params: {
  formId: number;
  adminId: number;
}): Promise<ProjectVerificationForm> => {
  const form = await ProjectVerificationForm.createQueryBuilder()
    .where('id = :id', { id: params.formId })
    .getOne();

  if (!form) throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);

  form.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
  form.lastStep = PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS;
  form.isTermAndConditionsAccepted = false;
  form.reviewer = await findUserById(params.adminId);
  return form.save();
};

export const findProjectVerificationFormById = async (
  projectVerificationId: number,
): Promise<ProjectVerificationForm | undefined> => {
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
): Promise<ProjectVerificationForm | undefined> => {
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
  const { personalInfo, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
  }

  projectVerificationForm.personalInfo = personalInfo;
  return projectVerificationForm?.save();
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
    throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
  }
  projectVerificationForm.managingFunds = managingFunds;
  return projectVerificationForm?.save();
};

export const getVerificationFormByProjectId = async (
  projectId: number,
): Promise<ProjectVerificationForm | undefined> => {
  return ProjectVerificationForm.createQueryBuilder('project_verification_form')
    .where(`project_verification_form.projectId=:projectId`, {
      projectId,
    })
    .leftJoinAndSelect('project_verification_form.project', 'project')
    .leftJoinAndSelect(
      'project_verification_form.socialProfiles',
      'socialProfiles',
    )
    .leftJoinAndSelect('project_verification_form.user', 'user')
    .getOne();
};
