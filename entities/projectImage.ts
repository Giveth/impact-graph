import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';

@Entity()
@ObjectType()
export class ProjectImage extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;
  @RelationId((projectImage: ProjectImage) => projectImage.project)
  @Column({ nullable: true })
  projectId: number;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  url?: string;
}
