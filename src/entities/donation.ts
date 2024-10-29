import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  Index,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';
import { QfRound } from './qfRound';
import { ChainType } from '../types/network';
import { EarlyAccessRound } from './earlyAccessRound';

export const DONATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
};

export const DONATION_ORIGINS = {
  IDRISS_TWITTER: 'Idriss',
  DRAFT_DONATION_MATCHING: 'DraftDonationMatching',
  CHAIN: 'Chain',
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
  EarlyAccessRound = 'earlyAccessRoundId',
  RewardTokenAmount = 'rewardTokenAmount',
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
  isProjectVerified: boolean;

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
  @Column({ type: 'float' })
  amount: number;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  valueEth: number;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  valueUsd: number;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  priceEth: number;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  priceUsd: number;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @RelationId((donation: Donation) => donation.project)
  @Column({ nullable: true })
  @Index('verified_project_id', {
    where: `status = '${DONATION_STATUS.VERIFIED}'`,
  })
  projectId: number;

  @Index()
  @Field(_type => QfRound, { nullable: true })
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound?: QfRound | null;

  @RelationId((donation: Donation) => donation.qfRound)
  @Column({ nullable: true })
  qfRoundId: number | null;

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

  @Field({ nullable: true })
  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  donationPercentage?: number;

  @Field(_type => EarlyAccessRound, { nullable: true })
  @ManyToOne(_type => EarlyAccessRound, { eager: true, nullable: true })
  earlyAccessRound?: EarlyAccessRound | null;

  @RelationId((donation: Donation) => donation.earlyAccessRound)
  @Column({ nullable: true })
  earlyAccessRoundId: number | null;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  rewardTokenAmount?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  rewardStreamStart?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  rewardStreamEnd?: Date;

  @Field({ nullable: true })
  @Column({ type: 'float', nullable: true })
  cliff?: number;

  // we should calculated these values in the front-end, because they are presentation logics
  // // Virtual field to calculate remaining months and days
  // @Field(_type => String, { nullable: true })
  // get unblockRemainingDays(): string | null {
  //   if (!this.rewardStreamEnd) {
  //     return null;
  //   }
  //
  //   const today = moment();
  //   const end = moment(this.rewardStreamEnd);
  //
  //   if (end.isBefore(today)) {
  //     return '0 days';
  //   }
  //
  //   const months = end.diff(today, 'months');
  //   today.add(months, 'months');
  //   const days = end.diff(today, 'days');
  //
  //   if (months <= 0 && days <= 0) {
  //     return '0 days';
  //   }
  //
  //   // Format the remaining time as "X months, Y days"
  //   const monthsText =
  //     months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';
  //   const daysText = days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
  //
  //   return `${monthsText}${monthsText && daysText ? ', ' : ''}${daysText}`;
  // }
  //
  // // Virtual field for lockedRewardTokenAmount
  // @Field(_type => Float, { nullable: true })
  // get lockedRewardTokenAmount(): number | null {
  //   if (
  //     !this.rewardTokenAmount ||
  //     !this.rewardStreamStart ||
  //     !this.rewardStreamEnd ||
  //     !this.cliff
  //   ) {
  //     return null;
  //   }
  //
  //   const now = new Date();
  //   const streamStart = new Date(this.rewardStreamStart);
  //   const streamEnd = new Date(this.rewardStreamEnd);
  //
  //   if (now < streamStart) {
  //     // If the current time is before the stream starts, return the total reward amount + cliff
  //     return this.rewardTokenAmount + this.cliff;
  //   }
  //
  //   if (now > streamEnd) {
  //     // If the current time is after the stream ends, no tokens are locked
  //     return 0;
  //   }
  //
  //   const totalStreamTime = streamEnd.getTime() - streamStart.getTime();
  //   const elapsedTime = now.getTime() - streamStart.getTime();
  //
  //   const remainingProportion = 1 - elapsedTime / totalStreamTime;
  //
  //   return this.rewardTokenAmount * remainingProportion;
  // }
  //
  // // Virtual field for claimableRewardTokenAmount
  // @Field(_type => Float, { nullable: true })
  // get claimableRewardTokenAmount(): number | null {
  //   if (
  //     this.rewardTokenAmount === undefined ||
  //     this.lockedRewardTokenAmount === null
  //   ) {
  //     return null;
  //   }
  //
  //   return this.rewardTokenAmount - this.lockedRewardTokenAmount;
  // }

  static async findXdaiGivDonationsWithoutPrice() {
    return this.createQueryBuilder('donation')
      .where(`donation.currency = 'GIV' AND donation."valueUsd" IS NULL `)
      .getMany();
  }
}
