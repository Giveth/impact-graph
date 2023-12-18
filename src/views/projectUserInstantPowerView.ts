import {
  ViewColumn,
  ViewEntity,
  BaseEntity,
  PrimaryColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { ColumnNumericTransformer } from '../utils/entities';
import { User } from '../entities/user';

@ViewEntity('project_user_instant_power_view', { synchronize: false })
@ObjectType()
export class ProjectUserInstantPowerView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  id: number;

  @ViewColumn()
  @Field()
  projectId: number;

  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user?: User;

  @ViewColumn()
  @Field()
  userId: number;

  @ViewColumn()
  @Field(type => Float)
  @Column('numeric', {
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  boostedPower: number;
}
