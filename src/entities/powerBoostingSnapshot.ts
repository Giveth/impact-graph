import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';
import { Max, Min, IsNumber } from 'class-validator';
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
  @Column()
  userId: number;

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

  @Field(type => PowerSnapshot, { nullable: false })
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
