import { Entity, Column, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'project_estimated_matching_view' })
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
export class ProjectEstimatedMatchingView {
  // Project ID associated with the donations
  @PrimaryColumn()
  projectId: number;

  // QF Round ID associated with the donations
  @PrimaryColumn()
  qfRoundId: number;

  // Sum of the square root of the value in USD of the donations
  @Column('double precision')
  sqrtRootSum: number;

  // Count of unique donations per user per project per QF round
  @Column('int')
  uniqueDonationCount: number;

  // Sum of the value in USD of the donations for active QF rounds where the donation status is verified
  @Column('double precision')
  sumValueUsd: number;

  // Count of unique donors who have verified donations for each project
  @Column('int')
  uniqueDonorsCount: number;
}