import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Reaction } from '../entities/reaction';
import { Context } from '../context';
import { Project, ProjectUpdate, ProjStatus } from '../entities/project';
import { ApolloContext } from '../types/ApolloContext';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { logger } from '../utils/logger';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { findProjectById } from '../repositories/projectRepository';
import { AppDataSource } from '../orm';

@Resolver(_of => Reaction)
export class ReactionResolver {
  @Query(_returns => [Reaction])
  async getProjectReactions(
    @Arg('projectId') projectId: number,
    @Ctx() { user: _user }: Context,
  ): Promise<Reaction[]> {
    return await Reaction.find({
      where: { projectId: projectId || -1 },
    });
  }

  @Mutation(_returns => Reaction)
  async likeProjectUpdate(
    @Arg('projectUpdateId', _type => Int) projectUpdateId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<Reaction> {
    if (!user || !user?.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const queryRunner = AppDataSource.getDataSource().createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();

    const projectUpdate = await queryRunner.manager.findOne(ProjectUpdate, {
      where: { id: projectUpdateId },
      select: ['projectId'],
    });

    if (!projectUpdate)
      throw Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_UPDATE_NOT_FOUND),
      );

    try {
      const reaction = await queryRunner.manager.create(Reaction, {
        userId: user?.userId,
        projectUpdateId,
        reaction: 'heart',
      });
      await Promise.all([
        queryRunner.manager.save(reaction),
        queryRunner.manager.increment(
          ProjectUpdate,
          { id: projectUpdateId },
          'totalReactions',
          1,
        ),
        queryRunner.manager.increment(
          Project,
          { id: projectUpdate.projectId },
          'qualityScore',
          10,
        ),
      ]);

      // commit transaction now:
      await queryRunner.commitTransaction();
      return reaction;
    } catch (e) {
      logger.error('like project update error', e);

      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      throw Error(i18n.__(translationErrorMessagesKeys.SOMETHING_WENT_WRONG));
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(_returns => Boolean)
  async unlikeProjectUpdate(
    @Arg('reactionId', _type => Int) reactionId: number,
    @Ctx()
    { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const queryRunner = AppDataSource.getDataSource().createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.findOne(Reaction, {
        where: {
          id: reactionId,
          userId: user?.userId,
        },
      });
      if (!reaction) return false;

      const projectUpdate = await queryRunner.manager.findOne(ProjectUpdate, {
        where: { id: reaction.projectUpdateId },
        select: ['projectId'],
      });

      if (!projectUpdate) return false;

      await Promise.all([
        queryRunner.manager.remove(reaction),
        queryRunner.manager.decrement(
          ProjectUpdate,
          { id: reaction.projectUpdateId },
          'totalReactions',
          1,
        ),
        queryRunner.manager.decrement(
          Project,

          { id: projectUpdate.projectId },
          'qualityScore',
          10,
        ),
      ]);
      await queryRunner.commitTransaction();
      return true;
    } catch (e) {
      logger.error('unlike project update error', e);
      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(_returns => Reaction)
  async likeProject(
    @Arg('projectId', _type => Int) projectId: number,
    @Ctx() { req: { user } }: ApolloContext,
  ): Promise<Reaction> {
    if (!user || !user?.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }
    if (project.statusId !== ProjStatus.active) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.PROJECT_IS_NOT_ACTIVE),
      );
    }

    const queryRunner = AppDataSource.getDataSource().createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.create(Reaction, {
        userId: user?.userId,
        projectId,
        reaction: 'heart',
      });

      await Promise.all([
        queryRunner.manager.save(reaction),
        queryRunner.manager.increment(
          Project,
          { id: projectId },
          'totalReactions',
          1,
        ),
        queryRunner.manager.increment(
          Project,
          { id: projectId },
          'qualityScore',
          10,
        ),
      ]);

      // commit transaction now:
      await queryRunner.commitTransaction();
      await getNotificationAdapter().projectReceivedHeartReaction({
        project,
        userId: user.userId,
      });

      return reaction;
    } catch (e) {
      logger.error('like project error', e);

      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      throw new Error(
        i18n.__(translationErrorMessagesKeys.SOMETHING_WENT_WRONG),
      );
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(_returns => Boolean)
  async unlikeProject(
    @Arg('reactionId', _type => Int) reactionId: number,
    @Ctx()
    { req: { user } }: ApolloContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(
        i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
      );

    const queryRunner = AppDataSource.getDataSource().createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.findOne(Reaction, {
        where: {
          id: reactionId,
          userId: user?.userId,
        },
      });
      if (!reaction) return false;

      await Promise.all([
        queryRunner.manager.remove(reaction),
        queryRunner.manager.decrement(
          Project,
          { id: reaction.projectId },
          'totalReactions',
          1,
        ),
        queryRunner.manager.decrement(
          Project,

          { id: reaction.projectId },
          'qualityScore',
          10,
        ),
      ]);
      await queryRunner.commitTransaction();
      return true;
    } catch (e) {
      logger.error('unlike project error', e);
      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }
}
