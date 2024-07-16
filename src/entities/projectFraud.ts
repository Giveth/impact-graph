import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
  Unique,
  Relation,
} from 'typeorm';
import { Project } from './project.js';
import { QfRound } from './qfRound.js';

@ObjectType()
@Entity()
@Unique(['projectId', 'qfRoundId'])
export class ProjectFraud extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Relation<Project>;

  @RelationId((projectFraud: ProjectFraud) => projectFraud.project)
  @Column()
  projectId: number;

  @Field(_type => QfRound)
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound: QfRound;

  @RelationId((projectFraud: ProjectFraud) => projectFraud.qfRound)
  @Column()
  qfRoundId: number;
}
