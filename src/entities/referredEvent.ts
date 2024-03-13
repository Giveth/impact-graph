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
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => Date, { nullable: true })
  @Column({ nullable: true })
  startTime?: Date;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  referrerId?: string;

  @Field(type => Boolean, { nullable: false })
  @Column({ nullable: false, default: false })
  isDonorLinkedToReferrer: boolean;

  @Field(type => Boolean, { nullable: false })
  @Column({ nullable: false, default: false })
  isDonorClickEventSent: boolean;

  @Field(type => User, { nullable: true })
  @OneToOne(type => User, { nullable: true })
  @JoinColumn()
  user: User;

  @Field(type => ID, { nullable: true })
  @RelationId((referredEvent: ReferredEvent) => referredEvent.user)
  @Column({ nullable: true })
  userId: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
