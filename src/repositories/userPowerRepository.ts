import { User } from '../entities/user';
import { UserPower } from '../entities/userPower';

export const insertNewUserPowers = async ({
  fromTimestamp,
  toTimestamp,
  givbackRound,
  averagePowers,
  users,
}: {
  fromTimestamp: Date;
  toTimestamp: Date;
  givbackRound: number;
  averagePowers: { [_: string]: number };
  users: Partial<User>[];
}) => {
  const newEntities: UserPower[] = users.map(user =>
    UserPower.create({
      userId: user.id,
      power: averagePowers[user.walletAddress as string],
      givbackRound,
      fromTimestamp,
      toTimestamp,
    }),
  );

  return UserPower.save(newEntities);
};

export const findUsersThatDidntSyncTheirPower = async (
  givbackRound: number,
  skip: number = 0,
  take: number = 50,
): Promise<[User[], number]> => {
  return (
    User.createQueryBuilder('user')
      // exclude other rounds by joining specified round
      .innerJoin('user.powerBoostings', 'powerBoostings')
      .leftJoinAndSelect(
        'user.userPowers',
        'userPowers',
        'userPowers.givbackRound = :givbackRound',
        { givbackRound },
      )
      // exclude those with already givbackround number Synced
      .where('userPowers.userId IS NULL')
      .select(['user.id', 'user.walletAddress'])
      .skip(skip)
      .take(take)
      .getManyAndCount()
  );
  // Return users that dont have any userPower with specified givbackRound
};

export const findUserPowerByUserIdAndRound = (params: {
  userId: number;
  givbackRound: number;
}): Promise<UserPower | undefined> => {
  const { userId, givbackRound } = params;
  return UserPower.createQueryBuilder('user_power')
    .where('"userId" = :userId', {
      userId,
    })
    .andWhere('"givbackRound" = :givbackRound', {
      givbackRound,
    })
    .getOne();
};
