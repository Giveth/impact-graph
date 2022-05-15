import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  ColumnOptions,
  RelationId,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';

export const DONATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
};

export const DONATION_TYPES = {
  CSV_AIR_DROP: 'csvAirDrop',
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
// https://typeorm.io/#/decorator-reference/unique
@Unique(['transactionId', 'toWalletAddress'])
export class Donation extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
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
  @Column('boolean', { default: false })
  // https://github.com/Giveth/impact-graph/issues/407#issuecomment-1066892258
  isProjectVerified: boolean;

  @Field()
  @Column('text', { default: 'pending' })
  status: string;

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

  @Index()
  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;
  @RelationId((donation: Donation) => donation.project)
  projectId: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  user: User;
  @RelationId((donation: Donation) => donation.user)
  userId: number;

  @Field(type => Date)
  @Column()
  createdAt: Date;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  donationType?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  transakStatus?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  transakTransactionLink?: string;

  @Field(type => Boolean, { nullable: true })
  @Column({ nullable: true, default: false })
  segmentNotified: boolean;

  @Field(type => Boolean, { nullable: true })
  @Column({ nullable: true, default: false })
  isTokenEligibleForGivback: boolean;

  static async findXdaiGivDonationsWithoutPrice() {
    return this.createQueryBuilder('donation')
      .where(`donation.currency = 'GIV' AND donation."valueUsd" IS NULL `)
      .getMany();
  }

  static async findStableCoinDonationsWithoutPrice() {
    return this.createQueryBuilder('donation')
      .where(
        `donation.currency = 'DAI' OR donation.currency= 'XDAI' OR donation.currency= 'WXDAI' OR donation.currency= 'USDT' OR donation.currency= 'USDC'`,
      )
      .andWhere(`donation."valueUsd" IS NULL `)
      .getMany();
  }
}
