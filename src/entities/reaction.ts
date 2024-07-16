import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  RelationId,
  ManyToOne,
  Index,
  Relation,
} from 'typeorm';
import { Project, ProjectUpdate } from './project.js';
import { User } from './user.js';

@Entity()
@ObjectType()
@Index(['userId', 'projectId'], { unique: true })
@Index(['userId', 'projectUpdateId'], { unique: true })
export class Reaction extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @ManyToOne(_type => ProjectUpdate)
  projectUpdate: Relation<ProjectUpdate>;

  @Index()
  @RelationId((reaction: Reaction) => reaction.projectUpdate)
  @Field(_type => ID, { nullable: true })
  @Column({ nullable: true })
  projectUpdateId?: number;

  // We just fill it with join when making query so dont need to Add @Column or @ManyToOne
  user: User;

  @Field(_type => ID)
  @Column()
  userId: number;

  @Field(_type => String)
  @Column()
  reaction: string;

  @ManyToOne(_type => Project)
  project: Relation<Project>;

  @Index()
  @Field(_type => ID, { nullable: true })
  @RelationId((reaction: Reaction) => reaction.project)
  @Column({ nullable: true })
  projectId: number;
}
export type REACTION_TYPE = 'heart';
