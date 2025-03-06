import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user';
import { Donation } from './donation';

@ObjectType()
@Entity('qacc_points_history')
@Unique(['donation'])
export class QaccPointsHistory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Index()
  @Field(_type => Donation, { nullable: true })
  @ManyToOne(() => Donation, { eager: true, onDelete: 'CASCADE' })
  donation: Donation;

  @Field(_type => Float, { nullable: false })
  @Column({ type: 'real', default: 0 })
  pointsEarned: number;

  @CreateDateColumn()
  createdAt: Date;
}
