import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryColumn,
  Entity,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
