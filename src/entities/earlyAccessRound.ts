import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Field, ID, ObjectType, Int, Float } from 'type-graphql';

@Entity()
@ObjectType()
export class EarlyAccessRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column()
  @Index({ unique: true })
  roundNumber: number;

  @Field(() => Date)
  @Column()
  startDate: Date;

  @Field(() => Date)
  @Column()
  endDate: Date;

  @Field(() => Int)
  @Column()
  roundUSDCapPerProject: number;

  @Field(() => Int)
  @Column()
  roundUSDCapPerUserPerProject: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8 })
  POLPriceAtRoundStart: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}
