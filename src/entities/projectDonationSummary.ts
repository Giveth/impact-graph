import { Field, ID, ObjectType, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  BaseEntity,
  Index,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';
import { EarlyAccessRound } from './earlyAccessRound';

@Entity()
@ObjectType()
export class ProjectDonationSummary extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Float)
  @Column({ type: 'real', default: 0 })
  totalDonationAmount: number;

  @Field(_type => Float)
  @Column({ type: 'real', default: 0 })
  totalDonationUsdAmount: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @Index()
  @Column({ nullable: false })
  projectId: number;

  @Field(_type => QfRound, { nullable: true })
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound?: QfRound;

  @Index()
  @Column({ nullable: true })
  qfRoundId?: number | null;

  @Field(_type => EarlyAccessRound, { nullable: true })
  @ManyToOne(_type => EarlyAccessRound, { eager: true })
  earlyAccessRound?: EarlyAccessRound;

  @Index()
  @Column({ nullable: true })
  earlyAccessRoundId?: number | null;

  @Field(_type => Date)
  @Column()
  createdAt: Date;

  @Field(_type => Date)
  @Column()
  updatedAt: Date;
}
