import { Field, ID, ObjectType, Int } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Project } from './project';

@Entity()
@ObjectType()
export class QfRound extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  name: string;

  @Field()
  @Index({ unique: true })
  @Column('text')
  slug: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  isActive: boolean;

  @Field(type => Number)
  @Column()
  allocatedFund: number;

  @Field(type => Number)
  @Column('real', { default: 0.2 })
  maximumReward: number;

  @Field(type => Number)
  @Column()
  minimumPassportScore: number;

  @Field(type => Number)
  @Column('real', { default: 1 })
  minimumValidUsdValue: number;

  @Field(type => [Int], { nullable: true }) // Define the new field as an array of integers
  @Column('integer', { array: true, default: [] })
  eligibleNetworks: number[];

  @Field(type => Date)
  @Column()
  beginDate: Date;

  @Field(type => Date)
  @Column()
  endDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(type => Project, project => project.qfRounds)
  projects: Project[];

  // only projects with status active can be listed automatically
  isEligibleNetwork(donationNetworkId: number): boolean {
    // when not specified, all are valid
    if (this.eligibleNetworks.length === 0) return true;

    return this.eligibleNetworks.includes(donationNetworkId);
  }
}
