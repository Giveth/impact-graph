import { Field, ID, ObjectType } from 'type-graphql';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  RelationId,
  ManyToOne,
  Index,
} from 'typeorm';
import { Project, ProjectUpdate } from './project';
import { User } from './user';

@Entity()
@ObjectType()
@Index(['userId', 'projectId'], { unique: true })
@Index(['userId', 'projectUpdateId'], { unique: true })
export class Reaction extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @ManyToOne(type => ProjectUpdate)
  projectUpdate: ProjectUpdate;

  @Index()
  @RelationId((reaction: Reaction) => reaction.projectUpdate)
  @Field(type => ID, { nullable: true })
  @Column({ nullable: true })
  projectUpdateId: number;

  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { nullable: true })
  user: User;
  @Field(type => ID)
  @Column()
  @RelationId((reaction: Reaction) => reaction.user)
  userId: number;

  @Field(type => String)
  @Column()
  reaction: string;

  @ManyToOne(type => Project)
  project: Project;

  @Index()
  @Field(type => ID, { nullable: true })
  @RelationId((reaction: Reaction) => reaction.project)
  @Column({ nullable: true })
  projectId: number;
}
export type REACTION_TYPE = 'heart';
