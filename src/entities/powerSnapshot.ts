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
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Date)
  @Column({
    type: 'timestamp without time zone',
    transformer: new ColumnDateTransformer(),
  })
  @Index({ unique: true })
  time: Date;

  @Field()
  @Column({ type: 'integer', nullable: true })
  roundNumber: number;

  @Field(type => Boolean, { nullable: true })
  @Column({ nullable: true })
  @Index()
  synced?: boolean;

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
