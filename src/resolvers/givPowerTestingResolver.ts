import {
  Arg,
  Args,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { findPowerBalances } from '../repositories/powerBalanceSnapshotRepository';
import { PowerSnapshot } from '../entities/powerSnapshot';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository';
import { PowerRound } from '../entities/powerRound';
import { getPowerRound } from '../repositories/powerRoundRepository';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { findFuturePowers } from '../repositories/projectFuturePowerViewRepository';
import { findProjectsPowers } from '../repositories/projectPowerViewRepository';
import { ProjectPowerView } from '../views/projectPowerView';
import { UserProjectPowerView } from '../views/userProjectPowerView';
import { getUserProjectPowers } from '../repositories/userProjectPowerViewRepository';
import { UserProjectPowerArgs } from './userProjectPowerResolver';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  findUserPowerBoostings,
  findUserProjectPowerBoostingsSnapshots,
} from '../repositories/powerBoostingRepository';
import { PowerBoosting } from '../entities/powerBoosting';

const enableGivPower = process.env.ENABLE_GIV_POWER_TESTING as string;

@ObjectType()
class PowerBalances {
  @Field(_type => [PowerBalanceSnapshot], { nullable: true })
  powerBalances?: PowerBalanceSnapshot[] | undefined;

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class PowerSnapshots {
  @Field(_type => [PowerSnapshot], { nullable: true })
  powerSnapshots?: PowerSnapshot[];

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class FuturePowers {
  @Field(_type => [ProjectFuturePowerView], { nullable: true })
  futurePowers?: ProjectFuturePowerView[];

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class ProjectsPowers {
  @Field(_type => [ProjectPowerView], { nullable: true })
  projectsPowers?: ProjectPowerView[];

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class UserProjectBoostings {
  @Field(_type => [UserProjectPowerView], { nullable: true })
  userProjectBoostings?: UserProjectPowerView[];

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class UserPowerBoostings {
  @Field(_type => [PowerBoosting], { nullable: true })
  powerBoostings?: PowerBoosting[];

  @Field(_type => Int)
  count: number;
}

@ObjectType()
class UserPowerBoostingsSnapshots {
  @Field(_type => [PowerBoostingSnapshot], { nullable: true })
  userPowerBoostingsSnapshot?: PowerBoostingSnapshot[];

  @Field(_type => Int)
  count: number;
}

// General resolver for testing team of givPower
@Resolver()
export class GivPowerTestingResolver {
  // Returns powerBalances by userIds or powerSnapshotIds or round, or any combination of those 3
  // Further filtering as required
  @Query(_returns => PowerBalances)
  async powerBalances(
    @Arg('userIds', _type => [Number], { defaultValue: [] }) userIds?: number[],
    @Arg('powerSnapshotIds', _type => [Number], { defaultValue: [] })
    powerSnapshotIds?: number[],
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
    @Arg('round', _type => Number, { nullable: true }) round?: number,
  ): Promise<PowerBalances> {
    if (enableGivPower !== 'true') {
      return {
        powerBalances: [],
        count: 0,
      };
    }

    const [powerBalances, count] = await findPowerBalances(
      round,
      userIds,
      powerSnapshotIds,
      take,
      skip,
    );
    return {
      powerBalances,
      count,
    };
  }

  // This is so Testing team know what snapshots where taken and in which rounds
  // So they can use other endpoints
  @Query(_returns => PowerSnapshots)
  async powerSnapshots(
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
    @Arg('round', _type => Number, { nullable: true }) round?: number,
    @Arg('powerSnapshotId', _type => Number, { nullable: true })
    powerSnapshotId?: number,
  ): Promise<PowerSnapshots> {
    if (enableGivPower !== 'true') {
      return {
        powerSnapshots: [],
        count: 0,
      };
    }

    const [powerSnapshots, count] = await findPowerSnapshots(
      round,
      powerSnapshotId,
      take,
      skip,
    );
    return {
      powerSnapshots,
      count,
    };
  }

  @Query(_returns => UserPowerBoostings)
  async userProjectPowerBoostings(
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
    @Arg('projectId', _type => Number, { nullable: true }) projectId?: number,
    @Arg('userId', _type => Number, { nullable: true }) userId?: number,
  ): Promise<UserPowerBoostings> {
    if (enableGivPower !== 'true') {
      return {
        powerBoostings: [],
        count: 0,
      };
    }

    const [powerBoostings, count] = await findUserPowerBoostings(
      userId,
      projectId,
      take,
      skip,
    );

    return {
      powerBoostings,
      count,
    };
  }

  @Query(_returns => UserPowerBoostingsSnapshots)
  async userProjectPowerBoostingsSnapshots(
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
    @Arg('projectId', _type => Number, { nullable: true }) projectId?: number,
    @Arg('userId', _type => Number, { nullable: true }) userId?: number,
    @Arg('powerSnapshotId', _type => Number, { nullable: true })
    powerSnapshotId?: number,
    @Arg('round', _type => Number, { nullable: true }) round?: number,
  ): Promise<UserPowerBoostingsSnapshots | undefined> {
    if (enableGivPower !== 'true') {
      return {
        userPowerBoostingsSnapshot: [],
        count: 0,
      };
    }

    const [userPowerBoostingsSnapshot, count] =
      await findUserProjectPowerBoostingsSnapshots(
        userId,
        projectId,
        take,
        skip,
        powerSnapshotId,
        round,
      );

    return {
      userPowerBoostingsSnapshot,
      count,
    };
  }

  // Know the current round running
  @Query(_returns => PowerRound)
  async currentPowerRound(): Promise<PowerRound | null> {
    return getPowerRound();
  }

  @Query(_returns => FuturePowers)
  async projectsFuturePowers(
    @Arg('projectIds', _type => [Number], { defaultValue: [] })
    projectIds?: number[],
    @Arg('round', _type => Number, { nullable: true }) round?: number,
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
  ): Promise<FuturePowers> {
    if (enableGivPower !== 'true') {
      return {
        futurePowers: [],
        count: 0,
      };
    }

    const [futurePowers, count] = await findFuturePowers(
      projectIds,
      round,
      take,
      skip,
    );

    return {
      futurePowers,
      count,
    };
  }

  @Query(_returns => ProjectsPowers)
  async projectsPowers(
    @Arg('projectIds', _type => [Number], { defaultValue: [] })
    projectIds?: number[],
    @Arg('round', _type => Number, { nullable: true }) round?: number,
    @Arg('take', _type => Number, { defaultValue: 100 }) take?: number,
    @Arg('skip', _type => Number, { defaultValue: 0 }) skip?: number,
  ): Promise<ProjectsPowers | undefined> {
    if (enableGivPower !== 'true') {
      return {
        projectsPowers: [],
        count: 0,
      };
    }

    const [projectsPowers, count] = await findProjectsPowers(
      projectIds,
      round,
      take,
      skip,
    );

    return {
      projectsPowers,
      count,
    };
  }

  @Query(_returns => UserProjectBoostings)
  async userProjectBoostings(
    @Args()
    { take, skip, projectId, userId, orderBy, round }: UserProjectPowerArgs,
  ): Promise<UserProjectBoostings | undefined> {
    if (enableGivPower !== 'true') {
      return {
        userProjectBoostings: [],
        count: 0,
      };
    }

    if (!projectId && !userId) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID,
        ),
      );
    }

    const [userProjectBoostings, count] = await getUserProjectPowers({
      take,
      skip,
      orderBy,
      userId,
      projectId,
      round,
    });

    return {
      userProjectBoostings,
      count,
    };
  }
}
