import { Arg, Ctx, Mutation, registerEnumType, Resolver } from 'type-graphql';
import { Donation, SortField } from '../entities/donation';
import { MyContext } from '../types/MyContext';
import { User } from '../entities/user';
import { errorMessages } from '../utils/errorMessages';
import {
  createProjectVerificationRequestValidator,
  validateWithJoiSchema,
} from '../utils/validators/graphqlQueryValidators';
import { logger } from '../utils/logger';
import { findProjectById } from '../repositories/projectRepository';
import {
  createProjectVerificationRequest,
  getInProgressProjectVerificationRequest,
} from '../repositories/projectVerificationRepository';
import { ProjectVerificationForm } from '../entities/projectVerificationForm';

registerEnumType(SortField, {
  name: 'SortField',
  description: 'Sort by field',
});

@Resolver(of => User)
export class ProjectVerificationRequestResolver {
  @Mutation(returns => Donation)
  async createProjectVerificationRequest(
    @Arg('projectId') projectId: number,
    @Ctx() ctx: MyContext,
  ): Promise<ProjectVerificationForm> {
    try {
      const userId = ctx?.req?.user?.userId;
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
        await getInProgressProjectVerificationRequest({ projectId });
      if (inProjectVerificationRequest) {
        throw new Error(
          errorMessages.THERE_IS_AN_ONGOING_VERIFICATION_REQUEST_FOR_THIS_PROJECT,
        );
      }
      return createProjectVerificationRequest({
        projectId,
        userId,
      });
    } catch (e) {
      logger.error('createProjectVerificationRequest() error', e);
      throw e;
    }
  }
}
