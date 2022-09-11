import { Connection, ViewColumn, ViewEntity } from 'typeorm';
import { PowerBoosting } from '../entities/powerBoosting';
import { UserPower } from '../entities/userPower';
import { PowerRound } from '../entities/powerRound';

@ViewEntity('project_power_view', { synchronize: false })
export class ProjectPowerView {
  @ViewColumn()
  projectId: number;

  @ViewColumn()
  totalPower: number;
}
