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
  STOPPED: 'stopped',
  FAILED: 'failed',
};

@Entity()
@ObjectType()
@Unique(['txHash', 'networkId', 'project'])
// TODO entity is not completed
export class RecurringDonation extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column({ nullable: false })
  networkId: number;

  @Field()
  @Column({ nullable: false })
  amount: number;

  @Field()
  @Column({ nullable: false, default: 0 })
  amountStreamed: number;

  @Field()
  @Column({ nullable: false, default: 0 })
  totalUsdStreamed: number;

  // daily, weekly, monthly, yearly (ONLY MONTHLY)
  @Field()
  @Column({ nullable: false })
  interval: string;

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
  @Field(type => Project)
  @ManyToOne(type => Project)
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
  anonymous: boolean;

  @Index()
  @Field(type => AnchorContractAddress)
  @ManyToOne(type => AnchorContractAddress)
  anchorContractAddress: AnchorContractAddress;

  @RelationId(
    (recurringDonation: RecurringDonation) =>
      recurringDonation.anchorContractAddress,
  )
  @Column({ nullable: true })
  anchorContractAddressId: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  donor: User;

  @RelationId((recurringDonation: RecurringDonation) => recurringDonation.donor)
  @Column({ nullable: true })
  donorId: number;

  @Field(type => [Donation], { nullable: true })
  @OneToMany(type => Donation, donation => donation.recurringDonation)
  donations?: Donation[];

  @UpdateDateColumn()
  @Field()
  updatedAt: Date;

  @CreateDateColumn()
  @Field()
  createdAt: Date;
}
