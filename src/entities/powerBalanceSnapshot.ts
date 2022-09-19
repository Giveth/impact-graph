import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
} from 'typeorm';

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
  @Column()
  powerSnapshotId: number;

  @Field()
  @Column('float')
  balance: number;
}
