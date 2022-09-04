import { publicSelectionFields, User } from '../entities/user';
import { UserPower } from '../entities/userPower';
import { Project } from '../entities/project';
import { errorMessages } from '../utils/errorMessages';

export const insertNewUserPower = async (params: {
  user: User;
  fromTimestamp: Date;
  toTimestamp: Date;
  givbackRound: number;
  power: number;
}) => {
  return UserPower.create(params).save();
};

export const findUsersThatDidntSyncTheirPower = (givbackRound: number) => {
  return User.createQueryBuilder('user')
    .innerJoinAndSelect('user.userPower', 'userPower')
    .where(`userPower.givbackRound `)
    .getMany();
  // Return users that dont have any userPower with specified givbackRound

  throw new Error(errorMessages.NOT_IMPLEMENTED);
};
