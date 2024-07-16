import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
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

  @Field(_type => ProjectStatus)
  // @ts-expect-error migrate to ESM
  @ManyToOne(() => import('./projectStatus.js').then(m => m.projectStatus))
  status: Promise<ProjectStatus>;

  @RelationId(
    (projectStatusReason: ProjectStatusReason) => projectStatusReason.status,
  )
  @Column({ nullable: true })
  statusId: number;
}
