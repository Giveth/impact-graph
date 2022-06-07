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
  getInProgressProjectVerificationRequest,
} from '../repositories/projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { updateProjectVerificationFormByUser } from '../services/projectVerificationFormService';
import { ProjectVerificationUpdateInput } from './types/ProjectVerificationUpdateInput';
import { getAnalytics, SegmentEvents } from '../analytics/analytics';
import * as jwt from 'jsonwebtoken';
import config from '../config';
import { countriesList } from '../utils/utils';
import { Country } from '../entities/Country';

const analytics = getAnalytics();

@Resolver(of => ProjectVerificationForm)
export class ProjectVerificationFormResolver {
  @Mutation(returns => ProjectVerificationForm)
  async projectVerificationConfirmEmail(
    @Arg('emailConfirmationToken') emailConfirmationToken: string,
  ): Promise<ProjectVerificationForm> {
    try {
      const secret = config.get('JWT_SECRET') as string;
      const decodedJwt: any = jwt.verify(emailConfirmationToken, secret);
      const projectVerificationFormId = decodedJwt.projectVerificationFormId;
      const projectVerificationForm = await findProjectVerificationFormById(
        projectVerificationFormId,
      );

      if (!projectVerificationForm) {
        throw new Error(errorMessages.PROJECT_VERIFICATION_FORM_NOT_FOUND);
      }

      projectVerificationForm.emailConfirmedAt = new Date();
      projectVerificationForm.emailConfirmed = true;
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

      const token = jwt.sign(
        { projectVerificationFormId },
        config.get('JWT_SECRET') as string,
        {
          expiresIn: '1h',
        },
      );

      const emailConfirmation = {
        email: projectVerificationForm.personalInfo.email,
        token,
      };

      analytics.track(
        SegmentEvents.SEND_EMAIL_CONFIRMATION,
        `givethId-${userId}`,
        emailConfirmation,
        null,
      );

      projectVerificationForm.emailConfirmationToken = token;
      projectVerificationForm.emailConfirmationSent = true;
      projectVerificationForm.emailConfirmationSentAt = new Date();
      await projectVerificationForm.save();

      return projectVerificationForm;
    } catch (e) {
      logger.error('sendEmailConfirmation() error', e);
      throw e;
    }
  }

  @Mutation(returns => ProjectVerificationForm)
  async createProjectVerificationForm(
    @Arg('projectId') projectId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = user?.userId;
      if (!userId) {
        throw new Error(errorMessages.UN_AUTHORIZED);
      }
      validateWithJoiSchema(
        {
          projectId,
        },
        createProjectVerificationRequestValidator,
      );
      const project = await findProjectById(projectId);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      if (Number(project.admin) !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);
      }
      if (project.verified) {
        throw new Error(errorMessages.PROJECT_IS_ALREADY_VERIFIED);
      }

      const inProjectVerificationRequest =
        await getInProgressProjectVerificationRequest(projectId);
      if (inProjectVerificationRequest) {
        throw new Error(
          errorMessages.THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT,
        );
      }
      return createProjectVerificationForm({
        projectId,
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
    // https://github.com/Giveth/impact-graph/pull/519#issuecomment-1136845612
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
      if (project.verified) {
        throw new Error(errorMessages.PROJECT_IS_ALREADY_VERIFIED);
      }
      if (Number(project.admin) !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);
      }

      const inProjectVerificationRequest =
        await getInProgressProjectVerificationRequest(project.id);
      if (!inProjectVerificationRequest) {
        throw new Error(
          errorMessages.THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT,
        );
      }
      return inProjectVerificationRequest;
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
