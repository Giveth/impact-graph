import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
} from 'typeorm';
import { Project } from './project';
import { QfRound } from './qfRound';

@ObjectType()
@Entity()
export class ProjectFraud extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field({ nullable: false })
  @Column('boolean', { nullable: false, default: false })
  confirmedFraud: boolean;

  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;

  @RelationId((projectFraud: ProjectFraud) => projectFraud.project)
  @Column()
  projectId: number;

  @Field(type => QfRound)
  @ManyToOne(type => QfRound, { eager: true })
  qfRound: QfRound;

  @RelationId((projectFraud: ProjectFraud) => projectFraud.qfRound)
  @Column()
  qfRoundId: number;
}
