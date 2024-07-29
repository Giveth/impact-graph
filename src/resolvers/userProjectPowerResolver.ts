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
import { Max, Min } from 'class-validator';
import { Service } from 'typedi';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages.js';
import { PowerBoosting } from '../entities/powerBoosting.js';
import { UserProjectPowerView } from '../views/userProjectPowerView.js';
import { getUserProjectPowers } from '../repositories/userProjectPowerViewRepository.js';

export enum UserPowerOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum UserPowerOrderField {
  Percentage = 'percentage',
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
export class UserPowerOrderBy {
  @Field(_type => UserPowerOrderField, {
    nullable: true,
    defaultValue: UserPowerOrderField.BoostedPower,
  })
  field: UserPowerOrderField | null;

  @Field(_type => UserPowerOrderDirection, {
    nullable: true,
    defaultValue: UserPowerOrderDirection.DESC,
  })
  direction: UserPowerOrderDirection;
}

@Service()
@ArgsType()
export class UserProjectPowerArgs {
  @Field(_type => Int, { defaultValue: 0 })
  @Min(0)
  skip: number;

  @Field(_type => Int, { defaultValue: 20 })
  @Min(0)
  @Max(50)
  take: number;

  @Field(_type => UserPowerOrderBy, {
    nullable: true,
    defaultValue: {
      field: UserPowerOrderField.BoostedPower,
      direction: UserPowerOrderDirection.DESC,
    },
  })
  orderBy: UserPowerOrderBy;

  @Field(_type => Int, { nullable: true })
  projectId?: number;

  @Field(_type => Int, { nullable: true })
  userId?: number;

  @Field(_type => Int, { nullable: true })
  round?: number;
}

@ObjectType()
class UserProjectPowers {
  @Field(_type => [UserProjectPowerView])
  userProjectPowers: UserProjectPowerView[];

  @Field(_type => Int)
  totalCount: number;
}

@Resolver(_of => PowerBoosting)
export class UserProjectPowerResolver {
  @Query(_returns => UserProjectPowers)
  async userProjectPowers(
    @Args()
    { take, skip, projectId, userId, orderBy }: UserProjectPowerArgs,
  ): Promise<UserProjectPowers> {
    if (!projectId && !userId) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID,
        ),
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
