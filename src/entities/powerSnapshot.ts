import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  OneToMany,
} from 'typeorm';
import { PowerBoostingSnapshot } from './powerBoostingSnapshot';
import { PowerBalanceSnapshot } from './powerBalanceSnapshot';

@Entity()
@ObjectType()
export class PowerSnapshot extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Date)
  @Column()
  @Index({ unique: true })
  time: Date;

  @Field(type => Int)
  @Column('integer', { nullable: true })
  @Index({ unique: true })
  blockNumber?: number;

  @Field()
  @Column({ type: 'integer', nullable: true })
  roundNumber: number;

  @Field(type => [PowerBoostingSnapshot], { nullable: true })
  @OneToMany(
    type => PowerBoostingSnapshot,
    powerBoostingSnapshot => powerBoostingSnapshot.powerSnapshot,
  )
  powerBoostingSnapshots?: PowerBoostingSnapshot[];

  @Field(type => [PowerBalanceSnapshot], { nullable: true })
  @OneToMany(
    type => PowerBalanceSnapshot,
    powerBalanceSnapshot => powerBalanceSnapshot.powerSnapshot,
  )
  powerBalanceSnapshots?: PowerBalanceSnapshot[];
}
