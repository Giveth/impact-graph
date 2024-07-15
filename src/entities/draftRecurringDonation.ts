import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { ChainType } from '../types/network.js';

export const DRAFT_RECURRING_DONATION_STATUS = {
  PENDING: 'pending',
  MATCHED: 'matched',
  FAILED: 'failed',
};

export const RECURRING_DONATION_ORIGINS = {
  DRAFT_RECURRING_DONATION_MATCHING: 'DraftRecurringDonationMatching',
};

@Entity()
@ObjectType()
// To mark the draft recurring donation as matched, when the recurringDonation is created in RecurringDonationResolver
export class DraftRecurringDonation extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ nullable: false })
  networkId: number;

  @Field()
  @Column({ nullable: false })
  flowRate: string;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ChainType,
    default: ChainType.EVM,
  })
  chainType: ChainType;

  @Index()
  @Field()
  @Column({ nullable: false })
  currency: string;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  isBatch: boolean;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  anonymous: boolean;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  // When creating a draft recurring donation, the user can choose to update an existing recurring donation
  // This flag is used to determine if the draft recurring donation is for update
  isForUpdate: boolean;

  @Field()
  @Column({ nullable: true })
  projectId: number;

  @Field()
  @Column({ nullable: true })
  @Index({ where: `status = '${DRAFT_RECURRING_DONATION_STATUS.PENDING}'` })
  donorId: number;

  @Field()
  @Column({
    type: 'enum',
    enum: DRAFT_RECURRING_DONATION_STATUS,
    default: DRAFT_RECURRING_DONATION_STATUS.PENDING,
  })
  @Index({ where: `status = '${DRAFT_RECURRING_DONATION_STATUS.PENDING}'` })
  status: string;
  @Field()
  @Column({ nullable: true })
  matchedRecurringDonationId?: number;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  origin: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  errorMessage?: string;

  @Index()
  @Field(_type => Date)
  @CreateDateColumn()
  createdAt: Date;
}
