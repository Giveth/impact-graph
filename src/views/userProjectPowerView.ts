import { Connection, ViewColumn, ViewEntity } from 'typeorm';
import { PowerBoosting } from '../entities/powerBoosting';
import { UserPower } from '../entities/userPower';

@ViewEntity({
  expression: (connection: Connection) =>
    connection
      .createQueryBuilder()
      .select('powerBoosting.id', 'id')
      .addSelect('powerBoosting.userId', 'userId')
      .addSelect('powerBoosting.projectId', 'projectId')
      .addSelect('powerBoosting.percentage', 'percentage')
      .addSelect('userPower.power', 'userPower')
      .addSelect(
        'userPower.power * powerBoosting.percentage / 100',
        'boostedPower',
      )
      .from(PowerBoosting, 'powerBoosting')
      .innerJoin(
        UserPower,
        'userPower',
        'userPower.userId = powerBoosting.userId',
      ),
})
export class UserProjectPowerView {
  @ViewColumn()
  id: number;

  @ViewColumn()
  userId: number;

  @ViewColumn()
  projectId: number;

  @ViewColumn()
  percentage: number;

  @ViewColumn()
  userPower: number;

  @ViewColumn()
  boostedPower: number;
}
