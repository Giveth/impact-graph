import {
  Field,
  ID,
  ObjectType,
  Float,
  registerEnumType,
  Int,
} from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user';
import { Project } from './project';

export enum CauseStatus {
  REJECTED = 'rejected',
  PENDING = 'pending',
  CLARIFICATION = 'clarification',
  VERIFICATION = 'verification',
  ACTIVE = 'active',
  DEACTIVE = 'deactive',
  CANCELLED = 'cancelled',
  DRAFTED = 'drafted',
}

export enum ListingStatus {
  NotReviewed = 'Not Reviewed',
  Listed = 'Listed',
  NotListed = 'Not Listed',
}

registerEnumType(CauseStatus, {
  name: 'CauseStatus',
  description: 'The status of a cause',
});

registerEnumType(ListingStatus, {
  name: 'ListingStatus',
  description: 'The listing status of a cause',
});

@Entity()
@ObjectType()
export class Cause extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  title: string;

  @Field()
  @Column('text')
  description: string;

  @Field()
  @Column()
  chainId: number;

  @Field()
  @Column('text')
  fundingPoolAddress: string;

  // we should not expose this field to the client
  @Column('text')
  fundingPoolHdPath: string;

  @Field()
  @Column('text', { unique: true })
  causeId: string;

  @Field()
  @Column('text', { unique: true })
  depositTxHash: string;

  @Field()
  @Column()
  depositTxChainId: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  givpowerRank: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  instantBoostingRank: number;

  @Field()
  @Column('text')
  mainCategory: string;

  @Field(_type => [String])
  @Column('text', { array: true, default: '{}' })
  subCategories: string[];

  @Field(_type => User)
  @ManyToOne(_type => User)
  @JoinColumn()
  owner: User;

  @Column()
  ownerId: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field(_type => CauseStatus)
  @Column({
    type: 'enum',
    enum: CauseStatus,
    default: CauseStatus.PENDING,
  })
  status: CauseStatus;

  // This is needed to return the enum value as a string
  @Field(() => String)
  get statusValue(): string {
    return this.status;
  }

  @Field(_type => ListingStatus)
  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.NotReviewed,
  })
  listingStatus: ListingStatus;

  // This is needed to return the enum value as a string
  @Field(() => String)
  get listingStatusValue(): string {
    return this.listingStatus;
  }

  @Field(_type => [Project])
  @ManyToMany(_type => Project, project => project.causes)
  projects: Project[];

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'integer', default: 0 })
  activeProjectsCount: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  totalRaised: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  totalDistributed: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  totalDonated: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  givPower: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  givBack: number;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
@ObjectType()
export class CauseProject extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Cause)
  @ManyToOne(_type => Cause)
  @JoinColumn()
  cause: Cause;

  @Column()
  causeId: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project)
  @JoinColumn()
  project: Project;

  @Column()
  projectId: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  amountReceived: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  amountReceivedUsdValue: number;

  @Field(_type => Float)
  @Column('float', { default: 0 })
  causeScore: number;
}
