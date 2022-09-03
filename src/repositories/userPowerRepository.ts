import { publicSelectionFields, User } from '../entities/user';
import { UserPower } from '../entities/userPower';
import { Project } from '../entities/project';
import { errorMessages } from '../utils/errorMessages';

export const insertNewUserPower = async (params: {
  user: User;
  fromTimestamp: number;
  toTimestamp: number;
  givbackRound: number;
  power: number;
}) => {
  return UserPower.create(params).save();
};

export const findUsersThatDidntSyncTheirPower = (givbackRound: number) => {
  // left outer join
  return (
    User.createQueryBuilder('user')
      // exclude other rounds by joining specified round
      .leftJoinAndSelect(
        'user.userPowers',
        'userPowers',
        'userPowers.givbackRound = :givbackRound',
        { givbackRound },
      )
      // exclude those with already givbackround number Synced
      .where('userPowers.userId IS NULL')
      .getMany()
  );
  // Return users that dont have any userPower with specified givbackRound
};
