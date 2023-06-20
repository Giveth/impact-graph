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
import { Project } from './project';
import { QfRound } from './qfRound';

@Entity()
@ObjectType()
// Have one record per projectId and qfRoundId
@Unique(['projectId', 'qfRoundId'])
export class QfRoundHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Project)
  project: Project;

  @Index()
  @Field(type => ID, { nullable: true })
  @RelationId((qfRoundHistory: QfRoundHistory) => qfRoundHistory.project)
  @Column({ nullable: true })
  projectId: number;

  @ManyToOne(type => QfRound)
  qfRound: QfRound;

  @Index()
  @Field(type => ID, { nullable: true })
  @RelationId((qfRoundHistory: QfRoundHistory) => qfRoundHistory.qfRound)
  @Column({ nullable: true })
  qfRoundId: number;

  @Field(type => Number)
  @Column({ default: 0 })
  uniqueDonors: number;

  @Field(type => Number)
  @Column({ default: 0 })
  donationsCount: number;

  @Field(type => Float)
  @Column({ type: 'real', nullable: true, default: 0 })
  raisedFundInUsd: number;

  @Field(type => Float)
  @Column({ type: 'real', nullable: true, default: 0 })
  matchingFund: number;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  sendMatchingFundTxLink: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
