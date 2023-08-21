import {
  BaseEntity,
  Column,
  CreateDateColumn,
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
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => ID)
  @RelationId(
    (powerBoostingSnapshot: PowerBoostingSnapshot) =>
      powerBoostingSnapshot.user,
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
    (powerBoostingSnapshot: PowerBoostingSnapshot) =>
      powerBoostingSnapshot.powerSnapshot,
  )
  @Column()
  powerSnapshotId: number;

  @Field(type => PowerSnapshot, { nullable: true })
  @ManyToOne(type => PowerSnapshot, { nullable: false })
  powerSnapshot: PowerSnapshot;

  @Field(type => Float)
  @Column('numeric', {
    precision: 5, // 100.00
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  percentage: number;
}
