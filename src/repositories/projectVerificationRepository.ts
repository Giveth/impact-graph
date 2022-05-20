import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';

export const createProjectVerificationRequest = async (params: {
  userId: number;
  projectId: number;
}): Promise<ProjectVerificationForm> => {
  const { userId, projectId } = params;
  return ProjectVerificationForm.create({
    userId,
    projectId,
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
  projectId,
): Promise<ProjectVerificationForm | undefined> => {
  return ProjectVerificationForm.createQueryBuilder()
    .where(`projectId=:projectId`, {
      projectId,
    })
    .andWhere(
      `
      status=:draft 
      OR status=:submitted
      `,
      {
        draft: PROJECT_VERIFICATION_STATUSES.DRAFT,
        submitted: PROJECT_VERIFICATION_STATUSES.SUBMITTED,
      },
    )
    .getOne();
};
