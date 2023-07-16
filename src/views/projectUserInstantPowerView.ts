import {
  ViewColumn,
  ViewEntity,
  BaseEntity,
  PrimaryColumn,
  Column,
} from 'typeorm';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { ColumnNumericTransformer } from '../utils/entities';

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
