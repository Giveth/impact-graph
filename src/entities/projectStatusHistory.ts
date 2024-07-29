import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  Relation,
} from 'typeorm';
import { Project } from './project.js';
import { ProjectStatus } from './projectStatus.js';
import { ProjectStatusReason } from './projectStatusReason.js';
import { User } from './user.js';

export const HISTORY_DESCRIPTIONS = {
  CHANGED_TO_VERIFIED: 'Changed to verified',
  CHANGED_TO_UNVERIFIED: 'Changed to unverified',
  CHANGED_TO_LISTED: 'Changed to listed',
  CHANGED_TO_UNVERIFIED_BY_CRONJOB: 'Changed to unverified automatically',
  CHANGED_TO_UNLISTED: 'Changed to unlisted',
  HAS_BEEN_EDITED: 'Has been edited',
};

@Entity()
@ObjectType()
export class ProjectStatusHistory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Relation<Project>;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.project,
  )
  @Column({ nullable: true })
  projectId: number;

  @Field(_type => ProjectStatus)
  @ManyToOne(_type => ProjectStatus)
  status: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.status,
  )
  @Column({ nullable: true })
  statusId: number;

  @Field(_type => ProjectStatus)
  @ManyToOne(_type => ProjectStatus)
  prevStatus?: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.prevStatus,
  )
  @Column({ nullable: true })
  prevStatusId: number;

  @Field(_type => ProjectStatusReason)
  @ManyToOne(_type => ProjectStatusReason)
  reason?: ProjectStatusReason;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.reason,
  )
  @Column({ nullable: true })
  reasonId: number;

  @Field(_type => User)
  @ManyToOne(_type => User)
  user?: Relation<User>;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.user,
  )
  @Column({ nullable: true })
  userId: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(_type => Date)
  @Column()
  createdAt: Date;
}
