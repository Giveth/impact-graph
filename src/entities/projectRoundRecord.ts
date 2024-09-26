import { Field, ID, ObjectType, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  BaseEntity,
  Index,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';
import { EarlyAccessRound } from './earlyAccessRound';

@Entity()
@ObjectType()
export class ProjectRoundRecord extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Float)
  @Column({ type: 'float', default: 0 })
  totalDonationAmount: number;

  @Field(_type => Float)
  @Column({ type: 'float', default: 0 })
  totalDonationUsdAmount: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  cumulativePastRoundsDonationAmounts?: number | null;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @Index()
  @Column({ nullable: false })
  @RelationId((ps: ProjectRoundRecord) => ps.project)
  projectId: number;

  @Field(_type => QfRound, { nullable: true })
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound?: QfRound;

  @Index()
  @Column({ nullable: true })
  @RelationId((ps: ProjectRoundRecord) => ps.qfRound)
  qfRoundId?: number | null;

  @Field(_type => EarlyAccessRound, { nullable: true })
  @ManyToOne(_type => EarlyAccessRound, { eager: true })
  earlyAccessRound?: EarlyAccessRound;

  @Index()
  @Column({ nullable: true })
  @RelationId((ps: ProjectRoundRecord) => ps.earlyAccessRound)
  earlyAccessRoundId?: number | null;

  @Field(_type => Date)
  @Column()
  createdAt: Date;

  @Field(_type => Date)
  @Column()
  updatedAt: Date;
}
