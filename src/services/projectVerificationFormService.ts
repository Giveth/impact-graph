import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import {
  submitProjectVerificationStepValidator,
  updateProjectVerificationManagingFundsStepValidator,
  updateProjectVerificationMilestonesStepValidator,
  updateProjectVerificationProjectContactsStepValidator,
  updateProjectVerificationProjectRegistryStepValidator,
  updateProjectVerificationTermsAndConditionsStepValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import {
  updateManagingFundsOfProjectVerification,
  updateMilestonesOfProjectVerification,
  updateProjectContactsOfProjectVerification,
  updateProjectRegistryOfProjectVerification,
  updateProjectVerificationStatus,
  updateTermsAndConditionsOfProjectVerification,
} from '../repositories/projectVerificationRepository';
import { errorMessages } from '../utils/errorMessages';
import { ProjectVerificationUpdateInput } from '../resolvers/types/ProjectVerificationUpdateInput';
import { logger } from '../utils/logger';

export const updateProjectVerificationFormByUser = async (params: {
  projectVerificationForm: ProjectVerificationForm;
  projectVerificationUpdateInput: ProjectVerificationUpdateInput;
}): Promise<ProjectVerificationForm> => {
  const { projectVerificationForm, projectVerificationUpdateInput } = params;
  const { projectVerificationId, step } = projectVerificationUpdateInput;
  const projectContacts =
    projectVerificationUpdateInput.projectContacts as ProjectContacts;
  const projectRegistry =
    projectVerificationUpdateInput.projectRegistry as ProjectRegistry;
  const milestones = projectVerificationUpdateInput.milestones as Milestones;
  const managingFunds =
    projectVerificationUpdateInput.managingFunds as ManagingFunds;
  const isTermAndConditionsAccepted =
    projectVerificationUpdateInput.isTermAndConditionsAccepted as boolean;
  switch (step) {
    case PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS:
      validateWithJoiSchema(
        {
          projectContacts,
        },
        updateProjectVerificationProjectContactsStepValidator,
      );
      return updateProjectContactsOfProjectVerification({
        projectVerificationId,
        projectContacts,
      });
    case PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY:
      validateWithJoiSchema(
        {
          projectRegistry,
        },
        updateProjectVerificationProjectRegistryStepValidator,
      );
      return updateProjectRegistryOfProjectVerification({
        projectVerificationId,
        projectRegistry,
      });
    case PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS:
      validateWithJoiSchema(
        {
          managingFunds,
        },
        updateProjectVerificationManagingFundsStepValidator,
      );
      return updateManagingFundsOfProjectVerification({
        projectVerificationId,
        managingFunds,
      });
    case PROJECT_VERIFICATION_STEPS.MILESTONES:
      validateWithJoiSchema(
        {
          milestones,
        },
        updateProjectVerificationMilestonesStepValidator,
      );
      return updateMilestonesOfProjectVerification({
        projectVerificationId,
        milestones,
      });
    case PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION:
      validateWithJoiSchema(
        {
          isTermAndConditionsAccepted,
        },
        updateProjectVerificationTermsAndConditionsStepValidator,
      );
      return updateTermsAndConditionsOfProjectVerification({
        projectVerificationId,
        isTermAndConditionsAccepted,
      });
    case PROJECT_VERIFICATION_STEPS.SUBMIT:
      validateWithJoiSchema(
        {
          projectRegistry: projectVerificationForm.projectRegistry,
          projectContacts: projectVerificationForm.projectContacts,
          milestones: projectVerificationForm.milestones,
          managingFunds: projectVerificationForm.managingFunds,
          socialProfiles: projectVerificationForm.socialProfiles,
          status: projectVerificationForm.status,
          isTermAndConditionsAccepted:
            projectVerificationForm.isTermAndConditionsAccepted,
        },
        submitProjectVerificationStepValidator,
      );
      return submitProjectVerificationForm({
        projectVerificationId,
      });

    default:
      throw new Error(errorMessages.INVALID_STEP);
  }
};

const submitProjectVerificationForm = async (params: {
  projectVerificationId: number;
}): Promise<ProjectVerificationForm> => {
  const { projectVerificationId } = params;
  return updateProjectVerificationStatus({
    projectVerificationId,
    status: PROJECT_VERIFICATION_STATUSES.SUBMITTED,
  });
  // TODO we might need to send email or segment event in this step
};
