import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import * as jwt from 'jsonwebtoken';
import moment from 'moment';
import { ApolloContext } from '../types/ApolloContext';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import {
  createProjectVerificationRequestValidator,
  getCurrentProjectVerificationRequestValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import {
  findProjectById,
  findProjectBySlug,
} from '../repositories/projectRepository';
import {
  createProjectVerificationForm,
  findProjectVerificationFormByEmailConfirmationToken,
  findProjectVerificationFormById,
  getVerificationFormByProjectId,
} from '../repositories/projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
  PROJECT_VERIFICATION_STEPS,
} from '../entities/projectVerificationForm';
import { updateProjectVerificationFormByUser } from '../services/projectVerificationFormService';
import { ProjectVerificationUpdateInput } from './types/ProjectVerificationUpdateInput';
import config from '../config';
import { countriesList } from '../utils/utils';
import { Country } from '../entities/Country';
import { sendMailConfirmationEmail } from '../services/mailerService';

@Resolver(_of => ProjectVerificationForm)
export class ProjectVerificationFormResolver {
  // https://github.com/Giveth/impact-graph/pull/519#issuecomment-1136845612
  @Mutation(_returns => ProjectVerificationForm)
  async projectVerificationConfirmEmail(
    @Arg('emailConfirmationToken') emailConfirmationToken: string,
  ): Promise<ProjectVerificationForm> {
    try {
      const secret = config.get('MAILER_JWT_SECRET') as string;

      const isValidToken =
        await findProjectVerificationFormByEmailConfirmationToken(
          emailConfirmationToken,
        );

      if (!isValidToken) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
          ),
        );
      }

      const decodedJwt: any = jwt.verify(emailConfirmationToken, secret);
      const projectVerificationFormId = decodedJwt.projectVerificationFormId;
      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationFormId,
      );

      if (!projectVerificationForm) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
          ),
        );
      }

      projectVerificationForm.emailConfirmationTokenExpiredAt = null;
      projectVerificationForm.emailConfirmationToken = null;
      projectVerificationForm.emailConfirmedAt = new Date();
      projectVerificationForm.emailConfirmed = true;
      if (!projectVerificationForm.lastStep) {
        // only incremental, parting from null
        projectVerificationForm.lastStep =
          PROJECT_VERIFICATION_STEPS.PERSONAL_INFO;
      }
      await projectVerificationForm.save();

      return projectVerificationForm;
    } catch (e) {
      // clean up to re-enable fields
      const projectVerificationForm =
        await findProjectVerificationFormByEmailConfirmationToken(
          emailConfirmationToken,
        );

      if (!projectVerificationForm) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
          ),
        );
      }

      projectVerificationForm.emailConfirmed = false;
      projectVerificationForm.emailConfirmationTokenExpiredAt = null;
      projectVerificationForm.emailConfirmationSent = false;
      projectVerificationForm.emailConfirmationSentAt = null;
      projectVerificationForm.emailConfirmationToken = null;

      await projectVerificationForm.save();
      logger.error('confirmEmail() error', e);
      throw e;
    }
  }

  @Mutation(_returns => ProjectVerificationForm)
  async projectVerificationSendEmailConfirmation(
    @Arg('projectVerificationFormId')
    projectVerificationFormId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationFormId,
      );

      if (!projectVerificationForm) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
          ),
        );
      }
      if (projectVerificationForm.userId !== userId) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
          ),
        );
      }
      const email = projectVerificationForm.personalInfo.email;
      const project = await findProjectById(projectVerificationForm.projectId);
      if (!project) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      }
      if (!email) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_SHOULD_FILL_EMAIL_PERSONAL_INFO_BEFORE_CONFIRMING_EMAIL,
          ),
        );
      }
      if (
        email === projectVerificationForm.email &&
        projectVerificationForm.emailConfirmed
      ) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.YOU_ALREADY_VERIFIED_THIS_EMAIL),
        );
      }

      const token = jwt.sign(
        { projectVerificationFormId },
        config.get('MAILER_JWT_SECRET') as string,
        {
          expiresIn: '2m',
        },
      );

      projectVerificationForm.emailConfirmationTokenExpiredAt = moment()
        .add(2, 'minutes')
        .toDate();
      projectVerificationForm.emailConfirmationToken = token;
      projectVerificationForm.emailConfirmationSent = true;
      projectVerificationForm.emailConfirmed = false;
      projectVerificationForm.email = email;
      projectVerificationForm.emailConfirmationSentAt = new Date();
      await projectVerificationForm.save();

      await sendMailConfirmationEmail(email, project, token);

      return projectVerificationForm;
    } catch (e) {
      logger.error('sendEmailConfirmation() error', e);
      throw e;
    }
  }

  @Mutation(_returns => ProjectVerificationForm)
  async createProjectVerificationForm(
    @Arg('slug') slug: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      validateWithJoiSchema(
        {
          slug,
        },
        createProjectVerificationRequestValidator,
      );
      const project = await findProjectBySlug(slug);
      if (!project) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      }
      if (Number(project.admin) !== userId) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
          ),
        );
      }
      if (project.verified) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_IS_ALREADY_VERIFIED),
        );
      }

      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (verificationForm) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT,
          ),
        );
      }
      return createProjectVerificationForm({
        projectId: project.id,
        userId,
      });
    } catch (e) {
      logger.error('createProjectVerificationRequest() error', e);
      throw e;
    }
  }

  @Mutation(_returns => ProjectVerificationForm)
  async updateProjectVerificationForm(
    @Arg('projectVerificationUpdateInput')
    projectVerificationUpdateInput: ProjectVerificationUpdateInput,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      const { projectVerificationId } = projectVerificationUpdateInput;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }

      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationId,
      );
      logger.debug('updateProjectVerificationForm', {
        projectVerificationForm,
        projectVerificationUpdateInput,
      });
      if (!projectVerificationForm) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_VERIFICATION_FORM_NOT_FOUND,
          ),
        );
      }
      if (projectVerificationForm.userId !== userId) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
          ),
        );
      }
      if (
        projectVerificationForm.status !== PROJECT_VERIFICATION_STATUSES.DRAFT
      ) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_IS_ALREADY_VERIFIED),
        );
      }
      const verificationForm = await updateProjectVerificationFormByUser({
        projectVerificationForm,
        projectVerificationUpdateInput,
      });

      return verificationForm;
    } catch (e) {
      logger.error('createProjectVerificationRequest() error', e);
      throw e;
    }
  }

  @Query(_returns => ProjectVerificationForm)
  async getCurrentProjectVerificationForm(
    @Arg('slug') slug: string,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
      }
      validateWithJoiSchema(
        {
          slug,
        },
        getCurrentProjectVerificationRequestValidator,
      );
      const project = await findProjectBySlug(slug);
      if (!project) {
        throw new Error(
          i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
        );
      }
      if (Number(project.admin) !== userId) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
          ),
        );
      }

      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (!verificationForm) {
        // Because frontend use hard coded english error message, we dont translate this error message
        // otherwise we need to handle all translation in frontend as well https://github.com/Giveth/giveth-dapps-v2/issues/3582#issuecomment-1913614715
        throw new Error(
          errorMessages.THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT,
        );
      }
      return verificationForm;
    } catch (e) {
      logger.error('getCurrentProjectVerificationForm() error', e);
      throw e;
    }
  }

  @Query(_returns => [Country])
  getAllowedCountries(): Country[] {
    return countriesList;
  }
}
