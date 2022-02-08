import {
  Arg,
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
    const update = await ProjectUpdate.findOne({
      where: { projectId, isMain: true },
    });

    return await Reaction.find({
      where: { projectUpdateId: update?.id || -1 },
    });
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
