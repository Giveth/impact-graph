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
  // return Project.createQueryBuilder('user')
  //   .innerJoinAndSelect('user.userPower', 'userPower')
  //   .where({
  //     id: projectId,
  //   })
  //   .getOne();

  throw new Error(errorMessages.NOT_IMPLEMENTED);
};
