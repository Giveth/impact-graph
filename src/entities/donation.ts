import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  OneToOne,
  JoinColumn,
  RelationId,
  Index,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';
import { QfRound } from './qfRound';
import { ChainType } from '../types/network';
import { RecurringDonation } from './recurringDonation';
import { SwapTransaction } from './swapTransaction';

export const DONATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
  SWAP_PENDING: 'swapPending',
};

export const DONATION_ORIGINS = {
  IDRISS_TWITTER: 'Idriss',
  DRAFT_DONATION_MATCHING: 'DraftDonationMatching',
  SUPER_FLUID: 'SuperFluid',
};

export const DONATION_TYPES = {
  CSV_AIR_DROP: 'csvAirDrop',
  GNOSIS_SAFE: 'gnosisSafe',
  POIGN_ART: 'poignArt',

  // TODO we should write a migration to fill this field for transak donations
  TRANSAK: 'transak',
};

export enum SortField {
  CreationDate = 'createdAt',
  TokenAmount = 'amount',
  UsdAmount = 'valueUsd',
}

@Entity()
@ObjectType()
export class Donation extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  // It's transactionHash for crypto donation, and trackingCode for fiat donation
  transactionId: string;

  @Field({ nullable: true })
  @Column('integer', { nullable: true })
  // To match the transaction in case user has done speed up
  nonce: number;

  @Field()
  @Column({ nullable: false })
  transactionNetworkId: number;

  @Field()
  @Column({ nullable: true })
  safeTransactionId?: string;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ChainType,
    default: ChainType.EVM,
  })
  chainType: ChainType;

  @Field()
  @Column('boolean', { default: false })
  // https://github.com/Giveth/impact-graph/issues/407#issuecomment-1066892258
  isProjectGivbackEligible: boolean;

  @Field()
  @Column('text', { default: DONATION_STATUS.PENDING })
  status: string;

  @Field(_type => Boolean)
  @Column({ type: 'boolean', default: false })
  isExternal: boolean;

  @Field(_type => Int)
  @Column('integer', { nullable: true })
  blockNumber?: number;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  origin: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  verifyErrorMessage: string;

  @Field()
  @Column('boolean', { default: false })
  speedup: boolean;

  @Field()
  @Column('boolean', { default: false })
  isCustomToken: boolean;

  @Field()
  @Column('boolean', { default: false })
  isFiat: boolean;

  @Field()
  @Column()
  toWalletAddress: string;

  @Field()
  @Column()
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

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  fromTokenAmount?: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  valueEth: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  valueUsd: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  priceEth: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  priceUsd: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  givbackFactor: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  powerRound: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  projectRank?: number;

  @Field({ nullable: true })
  @Column({ type: 'real', nullable: true })
  bottomRankInRound?: number;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @RelationId((donation: Donation) => donation.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => QfRound, { nullable: true })
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound: QfRound;

  @Field({ nullable: true })
  @RelationId((donation: Donation) => donation.qfRound)
  @Column({ nullable: true })
  qfRoundId: number;

  @Index()
  @Field(_type => QfRound, { nullable: true })
  @ManyToOne(_type => QfRound, { eager: true })
  distributedFundQfRound: QfRound;

  @RelationId((donation: Donation) => donation.distributedFundQfRound)
  @Column({ nullable: true })
  distributedFundQfRoundId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  user?: User;

  @RelationId((donation: Donation) => donation.user)
  @Column({ nullable: true })
  userId: number;

  @Index()
  @Field(_type => RecurringDonation, { nullable: true })
  @ManyToOne(_type => RecurringDonation, { eager: true, nullable: true })
  recurringDonation?: RecurringDonation;

  @RelationId((donation: Donation) => donation.recurringDonation)
  @Column({ nullable: true })
  recurringDonationId: number;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  contactEmail?: string | null;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true })
  qfRoundUserScore?: number;

  @Index()
  @Field(_type => Date)
  @Column()
  createdAt: Date;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  importDate: Date;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  donationType?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  onramperTransactionStatus?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  onramperId?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  referrerWallet?: string;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  referralStartTimestamp?: Date;

  @Field(_type => Boolean, { nullable: false })
  @Column({ nullable: false, default: false })
  isReferrerGivbackEligible: boolean;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  transakStatus?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  transakTransactionLink?: string;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: true, default: false })
  segmentNotified: boolean;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: true, default: false })
  isTokenEligibleForGivback: boolean;

  @Field({ nullable: true })
  @Column('integer', { nullable: true })
  // To match the superFluid Virtual Period
  virtualPeriodStart?: number;

  @Field({ nullable: true })
  @Column('integer', { nullable: true })
  // To match the superFluid Virtual Period
  virtualPeriodEnd?: number;

  @Field({ nullable: true })
  @Column('boolean', { nullable: true, default: false })
  useDonationBox?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  relevantDonationTxHash?: string;

  @Field()
  @Column({ default: false })
  isQRDonation: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  toWalletMemo?: string;

  @Field({ nullable: true })
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  donationPercentage?: number;

  @Field(_type => SwapTransaction, { nullable: true })
  @OneToOne(() => SwapTransaction, swapTransaction => swapTransaction.donation)
  @JoinColumn({ name: 'swapTransactionId' })
  swapTransaction?: SwapTransaction;

  @Field({ nullable: true })
  @Column({ nullable: true })
  swapTransactionId?: number;

  @Field({ nullable: false })
  @Column({ default: false })
  isSwap: boolean;

  static async findXdaiGivDonationsWithoutPrice() {
    return this.createQueryBuilder('donation')
      .where(`donation.currency = 'GIV' AND donation."valueUsd" IS NULL `)
      .getMany();
  }
}
