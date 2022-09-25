import {
  Args,
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { errorMessages } from '../utils/errorMessages';
import { PowerBoosting } from '../entities/powerBoosting';
import { Max, Min } from 'class-validator';
import { Service } from 'typedi';
import { UserProjectPowerView } from '../views/userProjectPowerView';
import { getUserProjectPowers } from '../repositories/userProjectPowerViewRepository';

enum UserPowerOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

enum UserPowerOrderField {
  Percentage = 'percentage',
  UserPower = 'userPower',
  BoostedPower = 'boostedPower',
}

registerEnumType(UserPowerOrderField, {
  name: 'UserPowerOrderField',
  description: 'Order by field',
});

registerEnumType(UserPowerOrderDirection, {
  name: 'UserPowerOrderDirection',
  description: 'Order direction',
});

@InputType()
class UserPowerOrderBy {
  @Field(type => UserPowerOrderField, {
    nullable: true,
    defaultValue: UserPowerOrderField.BoostedPower,
  })
  field: UserPowerOrderField;

  @Field(type => UserPowerOrderDirection, {
    nullable: true,
    defaultValue: UserPowerOrderDirection.DESC,
  })
  direction: UserPowerOrderDirection;
}

@Service()
@ArgsType()
export class UserProjectPowerArgs {
  @Field(type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(type => Int, { defaultValue: 20 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(type => UserPowerOrderBy, {
    nullable: true,
    defaultValue: {
      field: UserPowerOrderField.BoostedPower,
      direction: UserPowerOrderDirection.DESC,
    },
  })
  orderBy: UserPowerOrderBy;

  @Field(type => Int, { nullable: true })
  projectId?: number;

  @Field(type => Int, { nullable: true })
  userId?: number;
}

@ObjectType()
class UserProjectPowers {
  @Field(type => [UserProjectPowerView])
  userProjectPowers: UserProjectPowerView[];

  @Field(type => Int)
  totalCount: number;
}

@Resolver(of => PowerBoosting)
export class UserProjectPowerResolver {
  @Query(returns => UserProjectPowers)
  async userProjectPowers(
    @Args()
    { take, skip, projectId, userId, orderBy }: UserProjectPowerArgs,
  ): Promise<UserProjectPowers> {
    if (!projectId && !userId) {
      throw new Error(
        errorMessages.SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID,
      );
    }
    const [userProjectPowers, totalCount] = await getUserProjectPowers({
      userId,
      projectId,
      skip,
      orderBy,
      take,
    });
    return {
      userProjectPowers,
      totalCount,
    };
  }
}
