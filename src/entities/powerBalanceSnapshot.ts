import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  RelationId,
  ManyToOne,
  Relation,
} from 'typeorm';
import { PowerSnapshot } from './powerSnapshot.js';

@Entity()
@ObjectType()
@Index(['userId', 'powerSnapshotId'], { unique: true })
// To improve the performance of the query, we need to add the following index
@Index(['powerSnapshotId', 'userId'], { where: 'balance IS NULL' })
export class PowerBalanceSnapshot extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => ID)
  @Column()
  userId: number;

  @Field()
  @Column('float', { nullable: true })
  balance: number;

  @Field(_type => ID)
  @RelationId(
    (powerBalanceSnapshot: PowerBalanceSnapshot) =>
      powerBalanceSnapshot.powerSnapshot,
  )
  @Column()
  powerSnapshotId: number;

  @Field(_type => PowerSnapshot, { nullable: false })
  @ManyToOne(_type => PowerSnapshot, { nullable: false })
  powerSnapshot: Relation<PowerSnapshot>;
}
