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
import { ColumnDateTransformer } from '../utils/entities';

@Entity()
@ObjectType()
export class PowerSnapshot extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Date)
  @Column({
    type: 'timestamp without time zone',
    transformer: new ColumnDateTransformer(),
  })
  @Index({ unique: true })
  time: Date;

  @Field(_type => Int)
  @Column('integer', { nullable: true })
  @Index({ unique: true })
  blockNumber?: number;

  @Field()
  @Column({ type: 'integer', nullable: true })
  roundNumber: number;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: true })
  @Index()
  synced?: boolean;

  @Field(_type => [PowerBoostingSnapshot], { nullable: true })
  @OneToMany(
    _type => PowerBoostingSnapshot,
    powerBoostingSnapshot => powerBoostingSnapshot.powerSnapshot,
  )
  powerBoostingSnapshots?: PowerBoostingSnapshot[];

  @Field(_type => [PowerBalanceSnapshot], { nullable: true })
  @OneToMany(
    _type => PowerBalanceSnapshot,
    powerBalanceSnapshot => powerBalanceSnapshot.powerSnapshot,
  )
  powerBalanceSnapshots?: PowerBalanceSnapshot[];
}
