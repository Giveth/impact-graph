import { BaseEntity, Connection, Index, ViewColumn, ViewEntity } from 'typeorm';
import { PowerBoosting } from '../entities/powerBoosting';
import { UserPower } from '../entities/userPower';
import { PowerRound } from '../entities/powerRound';
import { Field, ObjectType } from 'type-graphql';

@ViewEntity('user_project_power_view', {
  synchronize: false,
})
@ObjectType()
export class UserProjectPowerView extends BaseEntity {
  @ViewColumn()
  @Field()
  id: number;

  @ViewColumn()
  @Field()
  userId: number;

  @ViewColumn()
  @Field()
  projectId: number;

  @ViewColumn()
  @Field()
  round: number;

  @ViewColumn()
  @Field()
  percentage: number;

  @ViewColumn()
  @Field()
  userPower: number;

  @ViewColumn()
  @Field()
  boostedPower: number;
}
