import {
  Arg,
  Ctx,
  Mutation,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import {
  createProjectVerificationRequestValidator,
  getCurrentProjectVerificationRequestValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import { findProjectById } from '../repositories/projectRepository';
import {
  createProjectVerificationForm,
  getInProgressProjectVerificationRequest,
} from '../repositories/projectVerificationRepository';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';

@Resolver(of => ProjectVerificationForm)
export class ProjectVerificationFormResolver {
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

  @Query(returns => ProjectVerificationForm)
  async getCurrentProjectVerificationForm(
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
        getCurrentProjectVerificationRequestValidator,
      );
      const project = await findProjectById(projectId);
      if (!project) {
        throw new Error(errorMessages.PROJECT_NOT_FOUND);
      }
      if (Number(project.admin) !== userId) {
        throw new Error(errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT);
      }

      const inProjectVerificationRequest =
        await getInProgressProjectVerificationRequest(projectId);
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
}
