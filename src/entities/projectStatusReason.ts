import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  Relation,
} from 'typeorm';
import { ProjectStatus } from './projectStatus.js';

@Entity()
@ObjectType()
export class ProjectStatusReason extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ nullable: true })
  description: string;

  @ManyToOne(_type => ProjectStatus)
  status: Relation<ProjectStatus>;

  @RelationId(
    (projectStatusReason: ProjectStatusReason) => projectStatusReason.status,
  )
  @Column({ nullable: true })
  statusId: number;
}
