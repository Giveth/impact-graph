import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  Float,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { MyContext } from '../types/MyContext';
import { errorMessages } from '../utils/errorMessages';
import { PowerBoosting } from '../entities/powerBoosting';
import {
  findPowerBoostings,
  setMultipleBoosting,
} from '../repositories/powerBoostingRepository';
import { Max, Min } from 'class-validator';
import { Service } from 'typedi';
import { OrderField } from '../entities/project';

enum PowerBoostingOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

enum PowerBoostingOrderField {
  CreationAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  Percentage = 'percentage',
}

registerEnumType(PowerBoostingOrderField, {
  name: 'PowerBoostingOrderField',
  description: 'Order by field',
});

registerEnumType(PowerBoostingOrderDirection, {
  name: 'PowerBoostingOrderDirection',
  description: 'Order direction',
});

@InputType()
class PowerBoostingOrderBy {
  @Field(type => PowerBoostingOrderField)
  field: PowerBoostingOrderField;

  @Field(type => PowerBoostingOrderDirection)
  direction: PowerBoostingOrderDirection;
}

@InputType()
export class GetPowerBoostingArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(type => Int, { defaultValue: 20 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(type => PowerBoostingOrderBy)
  orderBy: PowerBoostingOrderBy;

  @Field(type => Int, { nullable: true })
  projectId?: number;

  @Field(type => Int, { nullable: true })
  userId?: number;
}

@ObjectType()
class GivPowers {
  @Field(type => [PowerBoosting])
  powerBoostings: PowerBoosting[];

  @Field(type => Int)
  totalCount: number;
}

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

  @Query(returns => GivPowers)
  async getPowerBoosting(
    @Arg('args')
    args: GetPowerBoostingArgs,
  ): Promise<GivPowers> {
    if (!args.projectId || !args.userId) {
      throw new Error(
        errorMessages.SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID,
      );
    }
    const [powerBoostings, totalCount] = await findPowerBoostings(args);
    return {
      powerBoostings,
      totalCount,
    };
  }
}
