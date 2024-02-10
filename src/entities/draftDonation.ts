import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { ChainType } from '../types/network';

export const DRAFT_DONATION_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
};

@Entity()
@ObjectType()
@Index(
  ['fromWalletAddress', 'toWalletAddress', 'networkId', 'amount', 'currency'],
  {
    where: `status = '${DRAFT_DONATION_STATUS.PENDING}'`,
    unique: true,
  },
)
export class DraftDonation extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ nullable: false })
  networkId: number;

  // // TODO: support safeTransactionId
  // @Field()
  // @Column({ nullable: true })
  // safeTransactionId?: string;

  @Field()
  @Column({
    type: 'enum',
    enum: ChainType,
    default: ChainType.EVM,
  })
  chainType: ChainType;

  @Field()
  @Column({
    type: 'enum',
    enum: DRAFT_DONATION_STATUS,
    default: DRAFT_DONATION_STATUS.PENDING,
  })
  status: string;

  @Field()
  @Column()
  toWalletAddress: string;

  @Field()
  @Column()
  @Index()
  fromWalletAddress: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  tokenAddress?: string;

  @Field()
  @Column()
  currency: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  anonymous: boolean;

  @Field()
  @Column({ type: 'real' })
  amount: number;

  @Field()
  @Column({ nullable: true })
  projectId: number;

  @Field()
  @Column({ nullable: true })
  userId: number;

  @Index()
  @Field(type => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  referrerId?: string;

  // Expected call data used only for matching ERC20 transfers
  // Is calculated and saved once during the matching time, and will be used in next iterations
  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  expectedCallData?: string;
}
