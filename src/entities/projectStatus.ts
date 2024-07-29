import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from './project.js';
import { ProjectStatusReason } from './projectStatusReason.js';

@Entity()
@ObjectType()
export class ProjectStatus extends BaseEntity {
  @Field(_type => ID)
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

  @Field(_type => [Project], { nullable: true })
  @OneToMany(_type => Project, project => project.status)
  projects?: Project[];

  @Field(_type => [ProjectStatusReason], { nullable: true })
  @OneToMany(
    _type => ProjectStatusReason,
    projectStatusReason => projectStatusReason.status,
  )
  reasons?: ProjectStatusReason[];

  @Field(_type => [ProjectStatusReason], { nullable: true })
  @OneToMany(
    _type => ProjectStatusReason,
    projectStatusReason => projectStatusReason.status,
  )
  projectStatusHistories?: ProjectStatusReason[];
}
