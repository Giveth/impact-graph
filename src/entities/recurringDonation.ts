import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';
import { AnchorContractAddress } from './anchorContractAddress';
import { Donation } from './donation';

export const RECURRING_DONATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  ENDED: 'ended',
  FAILED: 'failed',
  ACTIVE: 'active',
};

@Entity()
@ObjectType()
@Unique(['txHash', 'networkId', 'project'])
// TODO entity is not completed
export class RecurringDonation extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column({ nullable: false })
  networkId: number;

  @Field()
  @Column({ nullable: true, default: 0, type: 'real' })
  amountStreamed?: number;

  @Field()
  @Column({ nullable: true, default: 0, type: 'real' })
  totalUsdStreamed?: number;

  // per second
  @Field()
  @Column({ nullable: false })
  flowRate: string;

  @Index()
  @Field()
  @Column({ nullable: false })
  txHash: string;

  @Index()
  @Field()
  @Column({ nullable: false })
  currency: string;

  @Index()
  @Field()
  @Column({ nullable: false, default: 'pending' })
  status: string;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Project;

  @RelationId(
    (recurringDonation: RecurringDonation) => recurringDonation.project,
  )
  @Column({ nullable: true })
  projectId: number;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  finished: boolean;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  isArchived: boolean;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  isBatch: boolean;

  @Column({ nullable: true, default: false })
  @Field({ nullable: true })
  anonymous: boolean;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  origin: string;

  @Index()
  @Field(_type => AnchorContractAddress)
  @ManyToOne(_type => AnchorContractAddress, { eager: true })
  anchorContractAddress: AnchorContractAddress;

  @RelationId(
    (recurringDonation: RecurringDonation) =>
      recurringDonation.anchorContractAddress,
  )
  @Column({ nullable: true })
  anchorContractAddressId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  donor: User;

  @RelationId((recurringDonation: RecurringDonation) => recurringDonation.donor)
  @Column({ nullable: true })
  donorId: number;

  @Field(_type => [Donation], { nullable: true })
  @OneToMany(_type => Donation, donation => donation.recurringDonation)
  donations?: Donation[];

  @UpdateDateColumn()
  @Field()
  updatedAt: Date;

  @CreateDateColumn()
  @Field()
  createdAt: Date;
}
