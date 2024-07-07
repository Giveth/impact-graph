import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  Index,
  PrimaryColumn,
  BaseEntity,
  ViewEntity,
  ManyToOne,
  ViewColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from './project';

@ViewEntity('project_estimated_matching_view', { synchronize: false })
@Index('project_estimated_matching_view_project_id_qfround_id', [
  'projectId',
  'qfRoundId',
])
@Index('project_estimated_matching_view_sqrt_root_sum', ['sqrtRootSum'])
@ObjectType()
export class ProjectEstimatedMatchingView extends BaseEntity {
  @Field(_type => Project)
  @ManyToOne(_type => Project, project => project.projectEstimatedMatchingView)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @Field()
  @ViewColumn()
  @PrimaryColumn()
  projectId: number;

  // QF Round ID associated with the donations
  @ViewColumn()
  @Field()
  @PrimaryColumn()
  qfRoundId: number;

  // Sum of the square root of the value in USD of the donations
  @ViewColumn()
  @Column('double precision')
  sqrtRootSum: number;
}
