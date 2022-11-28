import {
  Arg,
  Args,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';
import { Repository } from 'typeorm';
import { InjectRepository } from 'typeorm-typedi-extensions';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { Project } from '../entities/project';
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

@ObjectType()
class PowerBalances {
  @Field(type => [PowerBalanceSnapshot])
  powerBalances: PowerBalanceSnapshot[];

  @Field(type => Int)
  count: number;
}

class PowerSnapshots {
  @Field(type => [PowerSnapshot])
  powerSnapshots: PowerSnapshot[];

  @Field(type => Int)
  count: number;
}

class FuturePowers {
  @Field(type => [ProjectFuturePowerView])
  futurePowers: ProjectFuturePowerView[];

  @Field(type => Int)
  count: number;
}

class ProjectsPowers {
  @Field(type => [ProjectPowerView])
  projectsPowers: ProjectPowerView[];

  @Field(type => Int)
  count: number;
}

class UserProjectBoostings {
  @Field(type => [UserProjectPowerView])
  userProjectBoostings: UserProjectPowerView[];

  @Field(type => Int)
  count: number;
}

// General resolver for testing team of givPower
@Resolver()
export class GivPowerResolver {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  // Returns powerBalances by userIds or powerSnapshotIds or round, or any combination of those 3
  // Further filtering as required
  @Query(returns => PowerBalances)
  async powerBalances(
    @Arg('userIds', type => [Number], { defaultValue: [] }) userIds: number[],
    @Arg('powerSnapshotIds', type => [Number], { defaultValue: [] })
    powerSnapshotIds: number[],
    @Arg('take', type => Number, { defaultValue: 100 }) take: number,
    @Arg('skip', type => Number, { defaultValue: 0 }) skip: number,
    @Arg('round', type => Number) round?: number,
  ): Promise<PowerBalances> {
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
  @Query(returns => PowerSnapshots)
  async powerSnapshots(
    @Arg('take', type => Number, { defaultValue: 100 }) take: number,
    @Arg('skip', type => Number, { defaultValue: 0 }) skip: number,
    @Arg('round', type => Number) round?: number,
  ): Promise<PowerSnapshots> {
    const [powerSnapshots, count] = await findPowerSnapshots(round, take, skip);
    return {
      powerSnapshots,
      count,
    };
  }

  // Know the current round running
  @Query(returns => PowerRound)
  async currentPowerRound(): Promise<PowerRound | undefined> {
    return await getPowerRound();
  }

  @Query(returns => FuturePowers)
  async projectsFuturePowers(
    @Arg('projectIds', type => [Number], { defaultValue: [] })
    projectIds: number[],
    @Arg('round', type => Number) round: number,
    @Arg('take', type => Number, { defaultValue: 100 }) take: number,
    @Arg('skip', type => Number, { defaultValue: 0 }) skip: number,
  ): Promise<FuturePowers> {
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

  @Query(returns => ProjectsPowers)
  async projectsPowers(
    @Arg('projectIds', type => [Number], { defaultValue: [] })
    projectIds: number[],
    @Arg('round', type => Number) round: number,
    @Arg('take', type => Number, { defaultValue: 100 }) take: number,
    @Arg('skip', type => Number, { defaultValue: 0 }) skip: number,
  ): Promise<ProjectsPowers> {
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

  @Query(returns => UserProjectBoostings)
  async userProjectBoostings(
    @Args()
    { take, skip, projectId, userId, orderBy, round }: UserProjectPowerArgs,
  ): Promise<UserProjectBoostings> {
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
