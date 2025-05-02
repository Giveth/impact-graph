import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user';
import { Project } from './project';

export const VESTING_STATUS = {
  PENDING: 'pending',
  FINAL: 'FINAL',
};

@ObjectType()
@Entity('vesting_data')
export class VestingData extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @Field()
  @Column('text', { default: VESTING_STATUS.PENDING })
  status: string;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true, unique: true })
  walletAddress?: string;

  @Field()
  @Column()
  paymentToken: string;

  @Field()
  @Column({ type: 'bigint' })
  amount: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  rewardStreamStart?: Date;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  cliff?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  rewardStreamEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
