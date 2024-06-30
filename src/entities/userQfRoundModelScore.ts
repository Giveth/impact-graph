import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity()
export class UserQfRoundModelScore extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => ID, { nullable: false })
  @Column()
  userId: number;

  @Index()
  @Field(_type => ID, { nullable: false })
  @Column()
  qfRoundId: number;

  @Field(_type => Float, { nullable: false })
  @Column({ type: 'real', nullable: false, default: 0 })
  score: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
