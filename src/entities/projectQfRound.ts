import { Field, ID, ObjectType, Float, Int } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';

@Entity('project_qf_round')
@ObjectType()
@Unique(['projectId', 'qfRoundId'])
export class ProjectQfRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => ID)
  @Column()
  @Index()
  projectId: number;

  @Field(_type => ID)
  @Column()
  @Index()
  qfRoundId: number;

  @ManyToOne(_type => Project, project => project.projectQfRoundRelations)
  project: Project;

  @ManyToOne(_type => QfRound, qfRound => qfRound.projectQfRoundRelations)
  qfRound: QfRound;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'float', nullable: true, default: 0 })
  sumDonationValueUsd: number;

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'int', nullable: true, default: 0 })
  countUniqueDonors: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
