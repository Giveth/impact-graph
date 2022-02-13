import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from './project';
import { ProjectStatusReason } from './projectStatusReason';

@Entity()
@ObjectType()
export class ProjectStatus extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true })
  symbol: string;

  @Index()
  @Field()
  @Column({ nullable: true })
  name: string;

  @Field()
  @Column({ nullable: true })
  description: string;

  @Field(type => [Project], { nullable: true })
  @OneToMany(type => Project, project => project.status)
  projects?: Project[];

  @Field(type => [ProjectStatusReason], { nullable: true })
  @OneToMany(
    type => ProjectStatusReason,
    projectStatusReason => projectStatusReason.status,
  )
  reasons?: ProjectStatusReason[];

  @Field(type => [ProjectStatusReason], { nullable: true })
  @OneToMany(
    type => ProjectStatusReason,
    projectStatusReason => projectStatusReason.status,
  )
  projectStatusHistories?: ProjectStatusReason[];
}
