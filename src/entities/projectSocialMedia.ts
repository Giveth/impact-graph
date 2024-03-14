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
import { Project } from './project';
import { User } from './user';
import { ProjectSocialMediaType } from '../types/projectSocialMediaType';

@Entity()
@ObjectType()
export class ProjectSocialMedia extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => String)
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
  @Field(type => Project)
  @ManyToOne(type => Project)
  project: Project;

  @RelationId((relatedAddress: ProjectSocialMedia) => relatedAddress.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  user: User;

  @RelationId((relatedAddress: ProjectSocialMedia) => relatedAddress.user)
  @Column({ nullable: true })
  userId: number;
}
