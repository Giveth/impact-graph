import { Field, ID, ObjectType } from 'type-graphql';
import {
  Column,
  Entity,
  BaseEntity,
  Index,
  RelationId,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { PowerSnapshotHistory } from './powerSnapshotHistory';

@Entity()
@ObjectType()
export class PowerBalanceSnapshotHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryColumn()
  id: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field()
  @Column('float')
  balance: number;

  @Field(type => ID)
  @RelationId(
    (powerBalanceSnapshotHistory: PowerBalanceSnapshotHistory) =>
      powerBalanceSnapshotHistory.powerSnapshotHistory,
  )
  @Column()
  powerSnapshotId: number;

  @Field(type => PowerSnapshotHistory, { nullable: false })
  @ManyToOne(type => PowerSnapshotHistory, { nullable: false })
  powerSnapshotHistory: PowerSnapshotHistory;
}
