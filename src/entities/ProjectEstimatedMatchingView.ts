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
@Index('project_estimated_matching_view_sum_value_usd', ['sumValueUsd'])
@Index('project_estimated_matching_view_unique_donors_count', [
  'uniqueDonorsCount',
])
@Index('project_estimated_matching_view_unique_donation_count', [
  'uniqueDonationCount',
])
@ObjectType()
export class ProjectEstimatedMatchingView extends BaseEntity {
  @Field(type => Project)
  @ManyToOne(type => Project, project => project.projectEstimatedMatchingView)
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

  // Count of unique donations per user per project per QF round
  @ViewColumn()
  @Column('int')
  uniqueDonationCount: number;

  // Sum of the value in USD of the donations for active QF rounds where the donation status is verified
  @ViewColumn()
  @Column('double precision')
  sumValueUsd: number;

  // Count of unique donors who have verified donations for each project
  @ViewColumn()
  @Column('int')
  uniqueDonorsCount: number;
}
