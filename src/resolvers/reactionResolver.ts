import {
  Arg,
  Args,
  Ctx,
  Field,
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

  @Mutation(returns => Boolean)
  async likeProject(
    @Arg('projectId') projectId: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.create(Reaction, {
        userId: user?.userId,
        projectId,
        reaction: 'heart',
      });
      await queryRunner.manager.save(reaction);
      await queryRunner.manager.increment(
        Project,
        { id: projectId },
        'totalReactions',
        1,
      );
      await queryRunner.manager.increment(
        Project,

        { id: projectId },
        'qualityScore',
        10,
      );

      // commit transaction now:
      await queryRunner.commitTransaction();
      return true;
    } catch (e) {
      logger.error('like project error', e);

      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }

  @Mutation(returns => Boolean)
  async unlikeProject(
    @Arg('reactionId') reactionId: number,
    @Ctx()
    { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user || !user?.userId)
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();

    await queryRunner.startTransaction();

    try {
      const reaction = await queryRunner.manager.findOne(Reaction, {
        id: reactionId,
        userId: user?.userId,
      });
      if (!reaction) return false;

      await queryRunner.manager.remove(reaction);
      await queryRunner.manager.decrement(
        Project,
        { id: reaction.projectId },
        'totalReactions',
        1,
      );
      await queryRunner.manager.decrement(
        Project,

        { id: reaction.projectId },
        'qualityScore',
        10,
      );
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

  @Mutation(returns => Boolean)
  async toggleProjectUpdateReaction(
    @Arg('updateId') updateId: number,
    @Arg('reaction') reaction: REACTION_TYPE = 'heart',
    @Ctx() { req: { user } }: MyContext,
  ): Promise<boolean> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const update = await ProjectUpdate.findOne({ id: updateId });
    if (!update) throw new Error('Update not found.');

    // if there is one, then delete it
    const currentReaction = await Reaction.findOne({
      projectUpdateId: update.id,
      userId: user.userId,
    });

    const project = await Project.findOne({ id: update.projectId });
    if (!project) throw new Error('Project not found');

    if (currentReaction && currentReaction.reaction === reaction) {
      await Reaction.delete({
        projectUpdateId: update.id,
        userId: user.userId,
      });

      // increment qualityScore
      project.updateQualityScoreHeart(false);
      project.save();
      return false;
    } else {
      // if there wasn't one, then create it
      const newReaction = await Reaction.create({
        userId: user.userId,
        projectUpdateId: update.id,
        reaction,
      });

      project.updateQualityScoreHeart(true);
      project.save();

      await Reaction.save(newReaction);
    }
    await updateTotalReactionsOfAProject(update.projectId);

    return true;
  }

  @Mutation(returns => ToggleResponse)
  async toggleProjectReaction(
    @Arg('projectId') projectId: number,
    @Arg('reaction') reaction: REACTION_TYPE = 'heart',
    @Ctx() { req: { user } }: MyContext,
  ): Promise<object> {
    if (!user) throw new Error(errorMessages.AUTHENTICATION_REQUIRED);

    const project = await Project.findOne({ id: projectId });

    if (!project) throw new Error(errorMessages.PROJECT_NOT_FOUND);

    let update = await ProjectUpdate.findOne({ projectId, isMain: true });
    if (!update) {
      update = await ProjectUpdate.save(
        await ProjectUpdate.create({
          userId:
            project && project.admin && +project.admin ? +project.admin : 0,
          projectId,
          content: '',
          title: '',
          createdAt: new Date(),
          isMain: true,
        }),
      );
    }

    const usersReaction = await Reaction.findOne({
      projectUpdateId: update.id,
      userId: user.userId,
    });
    const [, reactionCount] = await Reaction.findAndCount({
      projectUpdateId: update.id,
    });

    await Reaction.delete({ projectUpdateId: update.id, userId: user.userId });
    const response = new ToggleResponse();
    response.reactionCount = reactionCount;

    if (usersReaction && usersReaction.reaction === reaction) {
      response.reaction = false;
      response.reactionCount = response.reactionCount - 1;
    } else {
      const newReaction = await Reaction.create({
        userId: user.userId,
        projectUpdateId: update.id,
        reaction,
        project,
      });

      await Reaction.save(newReaction);
      response.reactionCount = response.reactionCount + 1;
      response.reaction = true;
    }
    await updateTotalReactionsOfAProject(projectId);
    return response;
  }
}
