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
  FAILED: 'failed',
};

@Entity()
@ObjectType()
// To mark the draft donation as matched, when the donation is created in DonationResolver
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

  @Field(type => String)
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
  @Index({ where: `status = '${DRAFT_DONATION_STATUS.PENDING}'` })
  status: string;

  @Field()
  @Column()
  toWalletAddress: string;

  @Field()
  @Column()
  fromWalletAddress: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  tokenAddress: string;

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
  @Index({ where: `status = '${DRAFT_DONATION_STATUS.PENDING}'` })
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

  @Field({ nullable: true })
  @Column({ nullable: true })
  errorMessage?: string;
}
