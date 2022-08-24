import { Arg, Ctx, Float, Int, Mutation, Query, Resolver } from 'type-graphql';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import { PowerBoosting } from '../entities/powerBoosting';
import { setMultipleBoosting } from '../repositories/powerBoostingRepository';

@Resolver(of => PowerBoosting)
export class GivPowerResolver {
  @Mutation(returns => [PowerBoosting])
  async setMultiplePowerBoosting(
    @Arg('projectIds', type => [Int]) projectIds: number[],
    @Arg('percentages', type => [Int]) percentages: number[],
    @Ctx() { req: { user } }: MyContext,
  ): Promise<PowerBoosting[]> {
    if (!user || !user?.userId) {
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    }
    // validator: sum of percentages should not be more than 100, all projects should active, ...
    return setMultipleBoosting({
      userId: user?.userId,
      projectIds,
      percentages,
    });
  }

  @Mutation(returns => [PowerBoosting])
  async setSinglePowerBoosting(
    @Arg('projectId', type => Int) projectId: number,
    @Arg('percentage', type => Int) percentage: number,
    @Ctx() { req: { user } }: MyContext,
  ): Promise<PowerBoosting[]> {
    if (!user || !user?.userId) {
      throw new Error(errorMessages.AUTHENTICATION_REQUIRED);
    }
    // validate input data
    // return setSingleBoosting({
    //   userId: user?.userId,
    //   projectId,
    //   percentage,
    // });
    throw new Error(errorMessages.NOT_IMPLEMENTED);
  }
}
