import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { CauseProject } from '../entities/project';
import { ApolloContext } from '../types/ApolloContext';
import { logger } from '../utils/logger';
import SentryLogger from '../sentryLogger';
import {
  findCauseProjectByCauseAndProject,
  findCauseProjectsByCauseId,
  updateCauseProjectDistribution,
  updateCauseProjectEvaluation,
  bulkUpdateCauseProjectDistribution,
  bulkUpdateCauseProjectEvaluation,
} from '../repositories/causeProjectRepository';
import {
  UpdateCauseProjectInput,
  UpdateCauseProjectDistributionInput,
  UpdateCauseProjectEvaluationInput,
  CompleteDistributionUpdateInput,
  CompleteDistributionUpdateResponse,
} from './types/causeProject-input';
import { createOrUpdateCauseProject } from '../repositories/causeProjectRepository';
import { Cause } from '../entities/project';
import { User } from '../entities/user';

@Resolver(_of => CauseProject)
export class CauseProjectResolver {
  @Query(() => CauseProject, { nullable: true })
  async causeProject(
    @Arg('causeId') causeId: number,
    @Arg('projectId') projectId: number,
  ): Promise<CauseProject | null> {
    try {
      const causeProject = await findCauseProjectByCauseAndProject(
        causeId,
        projectId,
      );
      return causeProject;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('causeProject() error', { error: e, causeId, projectId });
      throw e;
    }
  }

  @Query(() => [CauseProject])
  async causeProjects(
    @Arg('causeId') causeId: number,
  ): Promise<CauseProject[]> {
    try {
      const causeProjects = await findCauseProjectsByCauseId(causeId);
      return causeProjects;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('causeProjects() error', { error: e, causeId });
      throw e;
    }
  }

  @Mutation(() => CauseProject)
  async updateCauseProject(
    @Arg('input') input: UpdateCauseProjectInput,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CauseProject> {
    try {
      // For now, we'll allow updates without authentication for external services
      // In production, you might want to add API key authentication
      logger.info('updateCauseProject() called', {
        input,
        userId: user?.userId,
      });

      const {
        causeId,
        projectId,
        amountReceived,
        amountReceivedUsdValue,
        causeScore,
      } = input;

      const causeProject = await createOrUpdateCauseProject(
        causeId,
        projectId,
        {
          amountReceived,
          amountReceivedUsdValue,
          causeScore,
        },
      );

      logger.info('CauseProject updated successfully', {
        causeId,
        projectId,
        causeProjectId: causeProject.id,
      });

      return causeProject;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateCauseProject() error', { error: e, input });
      throw e;
    }
  }

  @Mutation(() => CauseProject)
  async updateCauseProjectDistribution(
    @Arg('input') input: UpdateCauseProjectDistributionInput,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CauseProject> {
    try {
      logger.info('updateCauseProjectDistribution() called', {
        input,
        userId: user?.userId,
      });

      const { causeId, projectId, amountReceived, amountReceivedUsdValue } =
        input;

      const causeProject = await updateCauseProjectDistribution(
        causeId,
        projectId,
        amountReceived,
        amountReceivedUsdValue,
      );

      logger.info('CauseProject distribution updated successfully', {
        causeId,
        projectId,
        causeProjectId: causeProject.id,
      });

      return causeProject;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateCauseProjectDistribution() error', {
        error: e,
        input,
      });
      throw e;
    }
  }

  @Mutation(() => CauseProject)
  async updateCauseProjectEvaluation(
    @Arg('input') input: UpdateCauseProjectEvaluationInput,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CauseProject> {
    try {
      logger.info('updateCauseProjectEvaluation() called', {
        input,
        userId: user?.userId,
      });

      const { causeId, projectId, causeScore } = input;

      const causeProject = await updateCauseProjectEvaluation(
        causeId,
        projectId,
        causeScore,
      );

      logger.info('CauseProject evaluation updated successfully', {
        causeId,
        projectId,
        causeProjectId: causeProject.id,
      });

      return causeProject;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateCauseProjectEvaluation() error', { error: e, input });
      throw e;
    }
  }

  @Mutation(() => [CauseProject])
  async bulkUpdateCauseProjectDistribution(
    @Arg('updates', () => [UpdateCauseProjectDistributionInput])
    updates: UpdateCauseProjectDistributionInput[],
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CauseProject[]> {
    try {
      logger.info('bulkUpdateCauseProjectDistribution() called', {
        updateCount: updates.length,
        userId: user?.userId,
      });

      const causeProjects = await bulkUpdateCauseProjectDistribution(updates);

      logger.info('Bulk CauseProject distribution updated successfully', {
        updateCount: updates.length,
        resultCount: causeProjects.length,
      });

      return causeProjects;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('bulkUpdateCauseProjectDistribution() error', {
        error: e,
        updateCount: updates.length,
      });
      throw e;
    }
  }

  @Mutation(() => [CauseProject])
  async bulkUpdateCauseProjectEvaluation(
    @Arg('updates', () => [UpdateCauseProjectEvaluationInput])
    updates: UpdateCauseProjectEvaluationInput[],
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CauseProject[]> {
    try {
      logger.info('bulkUpdateCauseProjectEvaluation() called', {
        updateCount: updates.length,
        userId: user?.userId,
      });

      const causeProjects = await bulkUpdateCauseProjectEvaluation(updates);

      logger.info('Bulk CauseProject evaluation updated successfully', {
        updateCount: updates.length,
        resultCount: causeProjects.length,
      });

      return causeProjects;
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('bulkUpdateCauseProjectEvaluation() error', {
        error: e,
        updateCount: updates.length,
      });
      throw e;
    }
  }

  @Mutation(() => CompleteDistributionUpdateResponse)
  async updateCompleteDistribution(
    @Arg('update') update: CompleteDistributionUpdateInput,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<CompleteDistributionUpdateResponse> {
    try {
      logger.info('updateCompleteDistribution() called', {
        update,
        userId: user?.userId,
      });

      const { projects, feeBreakdown } = update;

      // Update all projects
      const updatedProjects =
        await bulkUpdateCauseProjectDistribution(projects);

      // Update cause's totalDistributed using the total amount from fee breakdown
      const cause = await Cause.findOne({
        where: { id: feeBreakdown.causeId, projectType: 'cause' },
        relations: ['adminUser'],
      });

      if (!cause) {
        throw new Error('Cause not found');
      }

      // Update cause's totalDistributed with the total amount from fee breakdown
      const currentTotalDistributed = cause.totalDistributed || 0;
      const newTotalDistributed =
        currentTotalDistributed + feeBreakdown.totalAmount;

      await Cause.update(
        { id: feeBreakdown.causeId },
        { totalDistributed: newTotalDistributed },
      );

      // Update cause owner's total earned
      if (cause.adminUser) {
        const currentOwnerTotalEarned = cause.ownerTotalEarned || 0;
        const currentOwnerTotalEarnedUsdValue =
          cause.ownerTotalEarnedUsdValue || 0;
        const newOwnerTotalEarned =
          currentOwnerTotalEarned + feeBreakdown.causeOwnerAmount;
        const newOwnerTotalEarnedUsdValue =
          currentOwnerTotalEarnedUsdValue +
          feeBreakdown.causeOwnerAmountUsdValue;

        await Cause.update(
          { id: feeBreakdown.causeId },
          {
            ownerTotalEarned: newOwnerTotalEarned,
            ownerTotalEarnedUsdValue: newOwnerTotalEarnedUsdValue,
          },
        );

        // Update user's totalCausesDistributed
        const currentTotalCausesDistributed =
          cause.adminUser.totalCausesDistributed || 0;
        const newTotalCausesDistributed =
          currentTotalCausesDistributed + feeBreakdown.totalAmount;

        // Update user's causesTotalEarned and causesTotalEarnedUsdValue
        const currentCausesTotalEarned = cause.adminUser.causesTotalEarned || 0;
        const currentCausesTotalEarnedUsdValue =
          cause.adminUser.causesTotalEarnedUsdValue || 0;
        const newCausesTotalEarned =
          currentCausesTotalEarned + feeBreakdown.causeOwnerAmount;
        const newCausesTotalEarnedUsdValue =
          currentCausesTotalEarnedUsdValue +
          feeBreakdown.causeOwnerAmountUsdValue;

        await User.update(
          { id: cause.adminUser.id },
          {
            totalCausesDistributed: newTotalCausesDistributed,
            causesTotalEarned: newCausesTotalEarned,
            causesTotalEarnedUsdValue: newCausesTotalEarnedUsdValue,
          },
        );

        logger.info('Cause owner total earned updated successfully', {
          causeId: feeBreakdown.causeId,
          totalAmount: feeBreakdown.totalAmount,
          totalAmountUsdValue: feeBreakdown.totalAmountUsdValue,
          newOwnerTotalEarned,
          newOwnerTotalEarnedUsdValue,
        });
      }

      logger.info('Complete distribution update successful', {
        projectCount: updatedProjects.length,
        causeId: feeBreakdown.causeId,
        totalAmount: feeBreakdown.totalAmount,
      });

      return { success: true };
    } catch (e) {
      SentryLogger.captureException(e);
      logger.error('updateCompleteDistribution() error', {
        error: e,
        update,
      });
      throw e;
    }
  }
}
