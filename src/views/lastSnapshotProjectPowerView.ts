import {
  BaseEntity,
  Column,
  Index,
  PrimaryColumn,
  ViewColumn,
  ViewEntity,
} from 'typeorm';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { ColumnNumericTransformer } from '../utils/entities.js';

@ViewEntity('last_snapshot_project_power_view', { synchronize: false })
@ObjectType()
export class LastSnapshotProjectPowerView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  projectId: number;

  @ViewColumn()
  @Field(_type => Float)
  @Column('numeric', {
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  totalPower: number;

  @ViewColumn()
  // Not sure why queries return type was string!
  @Field(_type => String)
  @Index()
  powerRank: string;

  @ViewColumn()
  @Field(_type => Int)
  round: number;
}
