import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project.js';
import { User } from './user.js';
import { ProjectSocialMediaType } from '../types/projectSocialMediaType.js';

@Entity()
@ObjectType()
export class ProjectSocialMedia extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ProjectSocialMediaType,
  })
  type: ProjectSocialMediaType;

  @Index()
  @Field()
  @Column()
  link: string;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Project;

  @RelationId((relatedAddress: ProjectSocialMedia) => relatedAddress.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  user: User;

  @RelationId((relatedAddress: ProjectSocialMedia) => relatedAddress.user)
  @Column({ nullable: true })
  userId: number;
}
