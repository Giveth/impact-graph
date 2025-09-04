import {
  Field,
  ID,
  ObjectType,
  Int,
  Float,
  registerEnumType,
} from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Project } from './project';
import { Donation } from './donation';

export enum QfStrategyEnum {
  Cocm = 'cocm',
  Regular = 'regular',
}

registerEnumType(QfStrategyEnum, {
  name: 'QfStrategyEnum', // Name to expose in GraphQL schema
});

@Entity()
@ObjectType()
export class QfRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  name: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  title: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  description: string;

  @Field()
  @Index({ unique: true })
  @Column('text')
  slug: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  isActive: boolean;

  @Field(_type => Number)
  @Column()
  allocatedFund: number;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true })
  allocatedFundUSD: number;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: true })
  allocatedFundUSDPreferred: boolean;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  allocatedTokenSymbol: string;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true })
  allocatedTokenChainId: number;

  @Field(_type => Number)
  @Column('real', { default: 0.2 })
  maximumReward: number;

  @Field(_type => Number)
  @Column('real')
  minimumPassportScore: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  minMBDScore: number;

  @Field(_type => Number)
  @Column('real', { default: 1 })
  minimumValidUsdValue: number;

  @Field(_type => [Int], { nullable: true }) // Define the new field as an array of integers
  @Column('integer', { array: true, default: [] })
  eligibleNetworks: number[];

  @Field(_type => Date)
  @Column()
  beginDate: Date;

  @Field(_type => Date)
  @Column()
  endDate: Date;

  @Field(_type => QfStrategyEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: QfStrategyEnum,
    default: QfStrategyEnum.Regular,
    nullable: true,
  })
  qfStrategy?: QfStrategyEnum;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  bannerBgImage: string;

  @Field(_type => [String])
  @Column('text', { array: true, default: [] })
  sponsorsImgs: string[];

  @Field(_type => Boolean)
  @Column({ default: false })
  isDataAnalysisDone: boolean;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  clusterMatchingSyncAt?: Date;

  @Field(_type => Int, { nullable: true })
  @Column({ nullable: true, default: 0 })
  priority: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(_type => Project, project => project.qfRounds)
  projects: Project[];

  @OneToMany(_type => Donation, donation => donation.qfRound)
  donations: Donation[];

  // only projects with status active can be listed automatically
  isEligibleNetwork(donationNetworkId: number): boolean {
    // when not specified, all are valid
    if (this.eligibleNetworks.length === 0) return true;

    return this.eligibleNetworks.includes(donationNetworkId);
  }
}
