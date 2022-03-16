import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany,
  Index,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { ProjectStatus } from './projectStatus';
import { ProjectStatusReason } from './projectStatusReason';
import { User } from './user';

export const HISTORY_DESCRIPTIONS = {
  CHANGED_TO_VERIFIED: 'Changed to verified',
  CHANGED_TO_UNVERIFIED: 'Changed to unverified',
  CHANGED_TO_LISTED: 'Changed to listed',
  CHANGED_TO_UNLISTED: 'Changed to unlisted',
  HAS_BEEN_EDITED: 'Has been edited',
};

@Entity()
@ObjectType()
export class ProjectStatusHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Project)
  @ManyToOne(type => Project)
  project: Project;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.project,
  )
  projectId: number;

  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  status: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.status,
  )
  statusId: number;

  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  prevStatus?: ProjectStatus;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) =>
      projectStatusHistory.prevStatus,
  )
  prevStatusId: number;

  @Field(type => ProjectStatusReason)
  @ManyToOne(type => ProjectStatusReason)
  reason?: ProjectStatusReason;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.reason,
  )
  reasonId: number;

  @Field(type => User)
  @ManyToOne(type => User)
  user?: User;

  @RelationId(
    (projectStatusHistory: ProjectStatusHistory) => projectStatusHistory.user,
  )
  userId: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(type => Date)
  @Column()
  createdAt: Date;
}
