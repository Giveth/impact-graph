import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { User } from './user';
import { ColumnNumericTransformer } from '../utils/entities';
import { PowerSnapshot } from './powerSnapshot';

@Entity()
@ObjectType()
@Index(['userId', 'projectId', 'powerSnapshotId'], { unique: true })
export class PowerBoostingSnapshot extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => ID)
  @RelationId(
    (powerBoostingSnapshot: PowerBoostingSnapshot) =>
      powerBoostingSnapshot.user,
  )
  @Column()
  userId: number;

  @Field(_type => User, { nullable: false })
  @ManyToOne(_type => User, { nullable: false })
  user: User;

  @Field(_type => ID)
  @Column()
  projectId: number;

  @Field(_type => ID)
  @RelationId(
    (powerBoostingSnapshot: PowerBoostingSnapshot) =>
      powerBoostingSnapshot.powerSnapshot,
  )
  @Column()
  powerSnapshotId: number;

  @Field(_type => PowerSnapshot, { nullable: true })
  @ManyToOne(_type => PowerSnapshot, { nullable: false })
  powerSnapshot: PowerSnapshot;

  @Field(_type => Float)
  @Column('numeric', {
    precision: 5, // 100.00
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  percentage: number;
}
