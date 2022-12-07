import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  RelationId,
} from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { User } from './user';
import { ColumnNumericTransformer } from '../utils/entities';
import { PowerSnapshotHistory } from './powerSnapshotHistory';

@Entity()
@ObjectType()
export class PowerBoostingSnapshotHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryColumn()
  id: number;

  @Field(type => ID)
  @RelationId(
    (powerBoostingSnapshotHistory: PowerBoostingSnapshotHistory) =>
      powerBoostingSnapshotHistory.user,
  )
  @Column()
  userId: number;

  @Field(type => User, { nullable: false })
  @ManyToOne(type => User, { nullable: false })
  user: User;

  @Field(type => ID)
  @Column()
  projectId: number;

  @Field(type => ID)
  @RelationId(
    (powerBoostingSnapshotHistory: PowerBoostingSnapshotHistory) =>
      powerBoostingSnapshotHistory.powerSnapshotHistory,
  )
  @Column()
  powerSnapshotId: number;

  @Field(type => PowerSnapshotHistory, { nullable: true })
  @ManyToOne(type => PowerSnapshotHistory, { nullable: false })
  powerSnapshotHistory: PowerSnapshotHistory;

  @Field(type => Float)
  @Column('numeric', {
    precision: 5, // 100.00
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  percentage: number;
}
