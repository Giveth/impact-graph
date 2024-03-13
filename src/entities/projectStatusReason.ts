import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { ProjectStatus } from './projectStatus';

@Entity()
@ObjectType()
export class ProjectStatusReason extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ nullable: true })
  description: string;

  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  status: ProjectStatus;

  @RelationId(
    (projectStatusReason: ProjectStatusReason) => projectStatusReason.status,
  )
  @Column({ nullable: true })
  statusId: number;
}
