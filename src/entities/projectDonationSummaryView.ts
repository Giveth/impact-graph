import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  PrimaryColumn,
  BaseEntity,
  ViewEntity,
  ManyToOne,
  ViewColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from './project';

@ViewEntity('project_donation_summary_view', { synchronize: false })
@ObjectType()
export class ProjectDonationSummaryView extends BaseEntity {
  @Field(_type => Project)
  @ManyToOne(_type => Project, project => project.projectEstimatedMatchingView)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @Field()
  @ViewColumn()
  @PrimaryColumn()
  projectId: number;

  @ViewColumn()
  @Column('double precision')
  sumVerifiedDonations: number;

  @ViewColumn()
  @Column('int')
  uniqueDonorsCount: number;
}
