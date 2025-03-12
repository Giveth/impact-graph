import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Donation } from './donation';

export const SWAP_TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

@Entity()
@ObjectType()
export class SwapTransaction extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  squidRequestId?: string;

  @Field()
  @Column()
  firstTxHash: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  secondTxHash?: string;

  @Field()
  @Column()
  fromChainId: number;

  @Field()
  @Column()
  toChainId: number;

  @Field()
  @Column()
  fromTokenAddress: string;

  @Field()
  @Column()
  toTokenAddress: string;

  @Field()
  @Column('double precision')
  fromAmount: number;

  @Field({ nullable: true })
  @Column('double precision', { nullable: true })
  toAmount?: number;

  @Field()
  @Column()
  fromTokenSymbol: string;

  @Field()
  @Column()
  toTokenSymbol: string;

  @Field()
  @Column({ default: SWAP_TRANSACTION_STATUS.PENDING })
  status: string;

  @Field(_type => String, { nullable: true })
  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Field(_type => Donation, { nullable: true })
  @OneToOne(() => Donation, donation => donation.swapTransaction)
  donation?: Donation;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
