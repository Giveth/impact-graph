import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project.js';

@Entity()
@ObjectType()
export class ProjectImage extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @RelationId((projectImage: ProjectImage) => projectImage.project)
  @Column({ nullable: true })
  projectId: number;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  url?: string;
}
