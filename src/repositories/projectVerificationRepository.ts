import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { findProjectById } from './projectRepository';
import { findUserById } from './userRepository';
import { Project } from '../entities/project';
import { Brackets } from 'typeorm';

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

export const findProjectVerificationFormById = async (
  projectVerificationId: number,
): Promise<ProjectVerificationForm | undefined> => {
  return ProjectVerificationForm.createQueryBuilder()
    .where({
      id: projectVerificationId,
    })
    .getOne();
};
export const updateProjectRegistryOfProjectVerification = async (params: {
  projectVerificationId: number;
  projectRegistry: ProjectRegistry;
}): Promise<ProjectVerificationForm | undefined> => {
  const { projectRegistry, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    return;
  }

  projectVerificationForm.projectRegistry = projectRegistry;
  return projectVerificationForm?.save();
};

export const updateProjectContactsOfProjectVerification = async (params: {
  projectVerificationId: number;
  projectContacts: ProjectContacts;
}): Promise<ProjectVerificationForm | undefined> => {
  const { projectContacts, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    return;
  }
  projectVerificationForm.projectContacts = projectContacts;
  return projectVerificationForm?.save();
};
export const updateMilestonesOfProjectVerification = async (params: {
  projectVerificationId: number;
  milestones: Milestones;
}): Promise<ProjectVerificationForm | undefined> => {
  const { milestones, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    return;
  }
  projectVerificationForm.milestones = milestones;
  return projectVerificationForm?.save();
};

export const updateManagingFundsOfProjectVerification = async (params: {
  projectVerificationId: number;
  managingFunds: ManagingFunds;
}): Promise<ProjectVerificationForm | undefined> => {
  const { managingFunds, projectVerificationId } = params;
  const projectVerificationForm = await findProjectVerificationFormById(
    projectVerificationId,
  );
  if (!projectVerificationForm) {
    return;
  }
  projectVerificationForm.managingFunds = managingFunds;
  return projectVerificationForm?.save();
};

export const getInProgressProjectVerificationRequest = async (
  projectId: number,
): Promise<ProjectVerificationForm | undefined> => {
  return ProjectVerificationForm.createQueryBuilder('project_verification_form')
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .andWhere(
      // https://stackoverflow.com/a/69165948/4650625
      new Brackets(qb => {
        qb.where('status = :draft', {
          draft: PROJECT_VERIFICATION_STATUSES.DRAFT,
        }).orWhere('status = :submitted', {
          submitted: PROJECT_VERIFICATION_STATUSES.SUBMITTED,
        });
      }),
    )
    .leftJoinAndSelect('project_verification_form.project', 'project')
    .leftJoinAndSelect('project_verification_form.user', 'user')
    .getOne();
};
