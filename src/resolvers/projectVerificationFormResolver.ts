import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
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
import {
  getAnalytics,
  NOTIFICATIONS_EVENT_NAMES,
} from '../analytics/analytics';
import * as jwt from 'jsonwebtoken';
import config from '../config';
import { countriesList } from '../utils/utils';
import { Country } from '../entities/Country';
import { sendMailConfirmationEmail } from '../services/mailerService';
import moment from 'moment';

const analytics = getAnalytics();

const dappUrl = process.env.FRONTEND_URL as string;

@Resolver(of => ProjectVerificationForm)
export class ProjectVerificationFormResolver {
  // https://github.com/Giveth/impact-graph/pull/519#issuecomment-1136845612
  @Mutation(returns => ProjectVerificationForm)
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
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
      }

      const decodedJwt: any = jwt.verify(emailConfirmationToken, secret);
      const projectVerificationFormId = decodedJwt.projectVerificationFormId;
      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationFormId,
      );

      if (!projectVerificationForm) {
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
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

  @Mutation(returns => ProjectVerificationForm)
  async projectVerificationSendEmailConfirmation(
    @Arg('projectVerificationFormId')
    projectVerificationFormId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }

      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationFormId,
      );

      if (!projectVerificationForm) {
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
      }
      if (projectVerificationForm.userId !== userId) {
        throw new Error(
          errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
        );
      }
      const email = projectVerificationForm.personalInfo.email;
      const project = await findProjectById(projectVerificationForm.projectId);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      if (!email) {
        throw new Error(
          errorMessages.YOU_SHOULD_FILL_EMAIL_PERSONAL_INFO_BEFORE_CONFIRMING_EMAIL,
        );
      }
      if (
        email === projectVerificationForm.email &&
        projectVerificationForm.emailConfirmed
      ) {
        throw new Error(errorMessages.YOU_ALREADY_VERIFIED_THIS_EMAIL);
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

      const callbackUrl = `https://${dappUrl}/verification/${project.slug}/${token}`;
      const emailConfirmationData = {
        email,
        callbackUrl,
      };

      await sendMailConfirmationEmail(email, project, token);

      analytics.track(
        NOTIFICATIONS_EVENT_NAMES.SEND_EMAIL_CONFIRMATION,
        `givethId-${userId}`,
        emailConfirmationData,
        null,
      );

      return projectVerificationForm;
    } catch (e) {
      logger.error('sendEmailConfirmation() error', e);
      throw e;
    }
  }

  @Mutation(returns => ProjectVerificationForm)
  async createProjectVerificationForm(
    @Arg('slug') slug: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }
      validateWithJoiSchema(
        {
          slug,
        },
        createProjectVerificationRequestValidator,
      );
      const project = await findProjectBySlug(slug);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      if (Number(project.admin) !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);
      }
      if (project.verified) {
        throw new Error(errorMessages.PROJECT_IS_ALREADY_VERIFIED);
      }

      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (verificationForm) {
        throw new Error(
          errorMessages.THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT,
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

  @Mutation(returns => ProjectVerificationForm)
  async updateProjectVerificationForm(
    @Arg('projectVerificationUpdateInput')
    projectVerificationUpdateInput: ProjectVerificationUpdateInput,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      const { projectVerificationId } = projectVerificationUpdateInput;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }

      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationId,
      );
      if (!projectVerificationForm) {
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
      }
      if (projectVerificationForm.userId !== userId) {
        throw new Error(
          errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT_VERIFICATION_FORM,
        );
      }
      if (
        projectVerificationForm.status !== PROJECT_VERIFICATION_STATUSES.DRAFT
      ) {
        throw new Error(errorMessages.PROJECT_IS_ALREADY_VERIFIED);
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

  @Query(returns => ProjectVerificationForm)
  async getCurrentProjectVerificationForm(
    @Arg('slug') slug: string,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }
      validateWithJoiSchema(
        {
          slug,
        },
        getCurrentProjectVerificationRequestValidator,
      );
      const project = await findProjectBySlug(slug);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      if (Number(project.admin) !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);
      }

      const verificationForm = await getVerificationFormByProjectId(project.id);
      if (!verificationForm) {
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

  @Query(returns => [Country])
  getAllowedCountries(): Country[] {
    return countriesList;
  }
}
