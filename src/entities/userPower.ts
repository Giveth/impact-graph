import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { User } from './user';
import { IsNumber, Min } from 'class-validator';

@ObjectType()
@Entity()
@Unique(['user', 'givbackRound'])
export class UserPower extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  user: User;

  @Index()
  @RelationId((userPower: UserPower) => userPower.user)
  @Column({ nullable: false })
  userId: number;

  @Field(type => Float)
  @Column({ type: 'float', nullable: true })
  @IsNumber()
  @Min(0)
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
