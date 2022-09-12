import { Connection, Index, ViewColumn, ViewEntity } from 'typeorm';
import { PowerBoosting } from '../entities/powerBoosting';
import { UserPower } from '../entities/userPower';
import { PowerRound } from '../entities/powerRound';

@ViewEntity('user_project_power_view', {
  synchronize: false,
})
export class UserProjectPowerView {
  @ViewColumn()
  id: number;

  @ViewColumn()
  userId: number;

  @ViewColumn()
  projectId: number;

  @ViewColumn()
  round: number;

  @ViewColumn()
  percentage: number;

  @ViewColumn()
  userPower: number;

  @ViewColumn()
  boostedPower: number;
}
