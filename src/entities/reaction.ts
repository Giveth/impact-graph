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
import { Project } from './project';

@Entity()
@ObjectType()
export class Reaction extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => ID)
  @Column()
  projectUpdateId: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field(type => String)
  @Column()
  reaction: string;

  @Index()
  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;
  @RelationId((reaction: Reaction) => reaction.project)
  @Column({ nullable: true })
  projectId: number;
}
export type REACTION_TYPE = 'heart';
