import { Field, ID, ObjectType, Float, Int } from 'type-graphql';
import {
  PrimaryColumn,
  Entity,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';

@Entity('project_qf_rounds_qf_round')
@ObjectType()
export class ProjectQfRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryColumn()
  projectId: number;

  @Field(_type => ID)
  @PrimaryColumn()
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
