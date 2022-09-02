import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { User } from './user';

@ObjectType()
@Entity()
// @Unique(['userId', 'givbackRound'])
export class UserPower extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  user: User;
  @RelationId((userPower: UserPower) => userPower.user)
  userId: number;

  @Field()
  @Column()
  power: number;

  @Field()
  @Column()
  fromTimestamp: Date;

  @Field()
  @Column()
  toTimestamp: Date;

  @Field()
  @Column()
  givbackRound: number;
}
