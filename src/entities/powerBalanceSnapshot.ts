import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  RelationId,
  ManyToOne,
} from 'typeorm';
import { PowerSnapshot } from './powerSnapshot';

@Entity()
@ObjectType()
@Index(['userId', 'powerSnapshotId'], { unique: true })
export class PowerBalanceSnapshot extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field(type => ID)
  @RelationId(
    (powerBalanceSnapshot: PowerBalanceSnapshot) =>
      powerBalanceSnapshot.powerSnapshot,
  )
  @Column()
  powerSnapshotId: number;

  @Field()
  @Column('float')
  balance: number;

  @Field(type => PowerSnapshot, { nullable: false })
  @ManyToOne(type => PowerSnapshot, { nullable: false })
  powerSnapshot: PowerSnapshot;
}
