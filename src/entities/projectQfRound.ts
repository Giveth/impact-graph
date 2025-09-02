import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';

@Entity('project_qf_rounds_qf_round')
@ObjectType()
@Unique(['projectId', 'qfRoundId'])
export class ProjectQfRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(_type => Project, project => project.projectQfRoundRelations)
  project: Project;

  @Index()
  @Field(_type => ID)
  @RelationId((projectQfRound: ProjectQfRound) => projectQfRound.project)
  @Column()
  projectId: number;

  @ManyToOne(_type => QfRound, qfRound => qfRound.projectQfRoundRelations)
  qfRound: QfRound;

  @Index()
  @Field(_type => ID)
  @RelationId((projectQfRound: ProjectQfRound) => projectQfRound.qfRound)
  @Column()
  qfRoundId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
