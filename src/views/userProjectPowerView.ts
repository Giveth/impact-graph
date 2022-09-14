import {
  BaseEntity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  ViewColumn,
  ViewEntity,
} from 'typeorm';
import { Field, ObjectType } from 'type-graphql';
import { User } from '../entities/user';

@ViewEntity('user_project_power_view', {
  synchronize: false,
})
@ObjectType()
export class UserProjectPowerView extends BaseEntity {
  @PrimaryColumn()
  @Field()
  // it's the powerBoostingId see the migration creation file to understand better
  id: number;

  @Field(type => User, { nullable: true })
  @JoinColumn({ referencedColumnName: 'id' })
  @ManyToOne(() => User, { eager: true })
  user?: User;

  @ViewColumn()
  @Field()
  @RelationId((userProjectView: UserProjectPowerView) => userProjectView.user)
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

  @ViewColumn()
  @Field(type => Date)
  updateTime: Date;
}
