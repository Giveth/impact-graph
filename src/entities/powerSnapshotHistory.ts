import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { PowerBalanceSnapshotHistory } from './powerBalanceSnapshotHistory';
import { PowerBoostingSnapshotHistory } from './powerBoostingSnapshotHistory';

@Entity()
@ObjectType()
export class PowerSnapshotHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryColumn()
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

  @Field(type => Boolean, { nullable: true })
  @Column({ nullable: true })
  @Index()
  synced?: boolean;
}
