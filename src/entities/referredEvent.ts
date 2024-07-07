import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  RelationId,
  OneToOne,
  UpdateDateColumn,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user';

@Entity()
@ObjectType()
export class ReferredEvent extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  startTime?: Date;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  referrerId?: string;

  @Field(_type => Boolean, { nullable: false })
  @Column({ nullable: false, default: false })
  isDonorLinkedToReferrer: boolean;

  @Field(_type => Boolean, { nullable: false })
  @Column({ nullable: false, default: false })
  isDonorClickEventSent: boolean;

  @Field(_type => User, { nullable: true })
  @OneToOne(_type => User, { nullable: true })
  @JoinColumn()
  user: User;

  @Field(_type => ID, { nullable: true })
  @RelationId((referredEvent: ReferredEvent) => referredEvent.user)
  @Column({ nullable: true })
  userId: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
