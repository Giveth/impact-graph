import {
  BaseEntity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  RelationId,
  ViewColumn,
  ViewEntity,
} from 'typeorm';
import { Field, ObjectType } from 'type-graphql';
import { User } from '../entities/user.js';

@ViewEntity('user_project_power_view', {
  synchronize: false,
})
@ObjectType()
export class UserProjectPowerView extends BaseEntity {
  @PrimaryColumn()
  @Field()
  // it's the powerBoostingId see the migration creation file to understand better
  id: number;

  @Field(_type => User, { nullable: true })
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
  boostedPower: number;

  @Field()
  @Column({
    select: false,
    nullable: true,
    insert: false,
    update: false,
  })
  rank?: number;
}
