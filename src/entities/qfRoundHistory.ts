import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project.js';
import { QfRound } from './qfRound.js';
import {
  findQfRoundById,
  getQfRoundTotalSqrtRootSumSquared,
  getProjectDonationsSqrtRootSum,
} from '../repositories/qfRoundRepository.js';
import { EstimatedMatching } from '../types/qfTypes.js';

@Entity()
@ObjectType()
// Have one record per projectId and qfRoundId
@Unique(['projectId', 'qfRoundId'])
export class QfRoundHistory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(_type => Project)
  project: Project;

  @Index()
  @Field(_type => ID, { nullable: true })
  @RelationId((qfRoundHistory: QfRoundHistory) => qfRoundHistory.project)
  @Column()
  projectId: number;

  @ManyToOne(_type => QfRound)
  qfRound: QfRound;

  @Index()
  @Field(_type => ID, { nullable: true })
  @RelationId((qfRoundHistory: QfRoundHistory) => qfRoundHistory.qfRound)
  @Column()
  qfRoundId: number;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true, default: 0 })
  uniqueDonors: number;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true, default: 0 })
  donationsCount: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  raisedFundInUsd: number;

  // usd value of matching fund
  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  matchingFund: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true })
  matchingFundAmount?: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true })
  matchingFundPriceUsd?: number;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  matchingFundCurrency?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  distributedFundTxHash: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  distributedFundNetwork: string;

  @Field(_type => Date, { nullable: true })
  @Column({ nullable: true })
  distributedFundTxDate: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // In your main class
  @Field(_type => EstimatedMatching, { nullable: true })
  async estimatedMatching(): Promise<EstimatedMatching | null> {
    const projectDonationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      this.projectId,
      this.qfRoundId,
    );

    const allProjectsSum = await getQfRoundTotalSqrtRootSumSquared(
      this.qfRoundId,
    );
    const qfRound = await findQfRoundById(this.qfRoundId);

    const matchingPool = qfRound!.allocatedFund;

    return {
      projectDonationsSqrtRootSum,
      allProjectsSum,
      matchingPool,
    };
  }
}
