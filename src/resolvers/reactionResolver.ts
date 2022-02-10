import {
  Arg,
  Args,
  Ctx,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Reaction, REACTION_TYPE } from '../entities/reaction';
import { Context } from '../context';
import { Project, ProjectUpdate } from '../entities/project';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import { updateTotalReactionsOfAProject } from '../services/reactionsService';
import { getConnection } from 'typeorm';
import { logger } from '../utils/logger';

@ObjectType()
class ToggleResponse {
  @Field(type => Boolean)
  reaction: boolean;

  @Field(type => Number)
  reactionCount: number;
}

@Resolver(of => Reaction)
export class ReactionResolver {
  @Query(returns => [Reaction])
  async getProjectReactions(
    @Arg('projectId') projectId: number,
    @Ctx() { user }: Context,
  ): Promise<Reaction[]> {
    return await Reaction.find({
      where: { projectId: projectId || -1 },
    });
  }

  @Mutation(returns => Reaction)
  async likeProjectUpdate(
    @Arg('projectUpdateId', type => Int) projectUpdateId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<Reaction> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const queryRunner = getConnection().createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();

    const projectUpdate = await queryRunner.manager.findOne(
      ProjectUpdate,
      { id: projectUpdateId },
      { select: ['projectId'] },
    );

    if (!projectUpdate) throw Error(errorMessages.PROJECT_UPDATE_NOT_FOUND);

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
      throw Error(errorMessages.SOMETHING_WENT_WRONG);
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(returns => Boolean)
  async unlikeProjectUpdate(
    @Arg('reactionId', type => Int) reactionId: number,
    @Ctx()
    { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const queryRunner = getConnection().createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.findOne(Reaction, {
        id: reactionId,
        userId: user?.userId,
      });
      if (!reaction) return false;

      const projectUpdate = await queryRunner.manager.findOne(
        ProjectUpdate,
        { id: reaction.projectUpdateId },
        { select: ['projectId'] },
      );

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

  @Mutation(returns => Reaction)
  async likeProject(
    @Arg('projectId', type => Int) projectId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<Reaction> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const queryRunner = getConnection().createQueryRunner();

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
      return reaction;
    } catch (e) {
      logger.error('like project error', e);

      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      throw new Error(errorMessages.SOMETHING_WENT_WRONG);
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(returns => Boolean)
  async unlikeProject(
    @Arg('reactionId', type => Int) reactionId: number,
    @Ctx()
    { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const queryRunner = getConnection().createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.findOne(Reaction, {
        id: reactionId,
        userId: user?.userId,
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
