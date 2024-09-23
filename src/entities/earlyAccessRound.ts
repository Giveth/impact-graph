import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType, Int } from 'type-graphql';

@Entity()
@ObjectType()
export class EarlyAccessRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column({ unique: true })
  roundNumber: number;

  @Field(() => Date)
  @Column()
  startDate: Date;

  @Field(() => Date)
  @Column()
  endDate: Date;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  tokenPrice?: number;
}
