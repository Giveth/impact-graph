import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
  PersonalInfo,
} from '../entities/projectVerificationForm';
import {
  submitProjectVerificationStepValidator,
  updateProjectVerificationManagingFundsStepValidator,
  updateProjectVerificationMilestonesStepValidator,
  updateProjectVerificationProjectContactsStepValidator,
  updateProjectVerificationProjectPersonalInfoStepValidator,
  updateProjectVerificationProjectRegistryStepValidator,
  updateProjectVerificationTermsAndConditionsStepValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import {
  findProjectVerificationFormById,
  updateManagingFundsOfProjectVerification,
  updateMilestonesOfProjectVerification,
  updateProjectContactsOfProjectVerification,
  updateProjectPersonalInfoOfProjectVerification,
  updateProjectRegistryOfProjectVerification,
  updateProjectVerificationLastStep,
  updateProjectVerificationStatus,
  updateTermsAndConditionsOfProjectVerification,
} from '../repositories/projectVerificationRepository';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { ProjectVerificationUpdateInput } from '../resolvers/types/ProjectVerificationUpdateInput';
import { removeUndefinedFieldsFromObject } from '../utils/utils';

const updateLastStep = async (params: {
  projectVerificationForm: ProjectVerificationForm;
  step: string;
}): Promise<ProjectVerificationForm> => {
  const { step, projectVerificationForm } = params;
  if (!projectVerificationForm.emailConfirmed) {
    //  https://github.com/Giveth/impact-graph/issues/567, If user didn't confirmed his/her email, we
    // set lastStep as null , so when they redirect verification form in frontend they would redirect to personalInfo page
    return updateProjectVerificationLastStep({
      projectVerificationId: projectVerificationForm.id,
      lastStep: null,
    });
  }
  const lastStep = projectVerificationForm.lastStep;
  const stepsArray = Object.values(PROJECT_VERIFICATION_STEPS);
  if (!lastStep || stepsArray.indexOf(step) > stepsArray.indexOf(lastStep)) {
    // If you fill an step we and after that you fill previous step we won't change your lastStep
    // in other word lastStep is incremental and it would not decrease
    return updateProjectVerificationLastStep({
      projectVerificationId: projectVerificationForm.id,
      lastStep: step,
    });
  }
  return projectVerificationForm;
};
export const updateProjectVerificationFormByUser = async (params: {
  projectVerificationForm: ProjectVerificationForm;
  projectVerificationUpdateInput: ProjectVerificationUpdateInput;
  email?: string;
}): Promise<ProjectVerificationForm> => {
  const { projectVerificationUpdateInput, email } = params;
  const { projectVerificationId, step } = projectVerificationUpdateInput;
  const personalInfo =
    projectVerificationUpdateInput.personalInfo as PersonalInfo;
  const projectContacts =
    projectVerificationUpdateInput.projectContacts as ProjectContacts[];
  const projectRegistry =
    projectVerificationUpdateInput.projectRegistry as ProjectRegistry;
  const milestones = projectVerificationUpdateInput.milestones as Milestones;
  const managingFunds =
    projectVerificationUpdateInput.managingFunds as ManagingFunds;
  const isTermAndConditionsAccepted =
    projectVerificationUpdateInput.isTermAndConditionsAccepted as boolean;
  let updatedProjectVerificationForm: ProjectVerificationForm;
  switch (step) {
    case PROJECT_VERIFICATION_STEPS.PERSONAL_INFO:
      validateWithJoiSchema(
        {
          personalInfo,
        },
        updateProjectVerificationProjectPersonalInfoStepValidator,
      );
      updatedProjectVerificationForm =
        await updateProjectPersonalInfoOfProjectVerification({
          projectVerificationId,
          personalInfo,
        });
      break;
    case PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS:
      validateWithJoiSchema(
        {
          projectContacts,
        },
        updateProjectVerificationProjectContactsStepValidator,
      );
      updatedProjectVerificationForm =
        await updateProjectContactsOfProjectVerification({
          projectVerificationId,
          projectContacts,
          email,
        });
      break;
    case PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY:
      validateWithJoiSchema(
        {
          projectRegistry,
        },
        updateProjectVerificationProjectRegistryStepValidator,
      );
      updatedProjectVerificationForm =
        await updateProjectRegistryOfProjectVerification({
          projectVerificationId,
          projectRegistry,
          email,
        });
      break;
    case PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS:
      validateWithJoiSchema(
        {
          managingFunds,
        },
        updateProjectVerificationManagingFundsStepValidator,
      );
      updatedProjectVerificationForm =
        await updateManagingFundsOfProjectVerification({
          projectVerificationId,
          managingFunds,
          email,
        });
      break;
    case PROJECT_VERIFICATION_STEPS.MILESTONES:
      validateWithJoiSchema(
        {
          milestones,
        },
        updateProjectVerificationMilestonesStepValidator,
      );
      updatedProjectVerificationForm =
        await updateMilestonesOfProjectVerification({
          projectVerificationId,
          milestones,
          email,
        });
      break;
    case PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION: {
      validateWithJoiSchema(
        {
          isTermAndConditionsAccepted,
        },
        updateProjectVerificationTermsAndConditionsStepValidator,
      );
      updatedProjectVerificationForm =
        await updateTermsAndConditionsOfProjectVerification({
          projectVerificationId,
          isTermAndConditionsAccepted,
          email,
        });

      break;
    }
    case PROJECT_VERIFICATION_STEPS.SUBMIT: {
      const getProjectVerificationData = await findProjectVerificationFormById(
        projectVerificationId,
      );
      const data = removeUndefinedFieldsFromObject({
        projectRegistry: getProjectVerificationData?.projectRegistry,
        projectContacts: getProjectVerificationData?.projectContacts,
        milestones: getProjectVerificationData?.milestones,
        managingFunds: getProjectVerificationData?.managingFunds,
        socialProfiles: getProjectVerificationData?.socialProfiles,
        status: getProjectVerificationData?.status,
        emailConfirmed: getProjectVerificationData?.emailConfirmed,
        isTermAndConditionsAccepted:
          getProjectVerificationData?.isTermAndConditionsAccepted,
      });
      validateWithJoiSchema(data, submitProjectVerificationStepValidator);
      updatedProjectVerificationForm = await submitProjectVerificationForm({
        projectVerificationId,
      });

      break;
    }
    default:
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_STEP));
  }

  return updateLastStep({
    projectVerificationForm: updatedProjectVerificationForm,
    step,
  });
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
