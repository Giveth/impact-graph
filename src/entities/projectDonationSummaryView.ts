import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  PrimaryColumn,
  BaseEntity,
  ViewEntity,
  ViewColumn,
} from 'typeorm';

@ViewEntity('project_donation_summary_view', { synchronize: false })
@ObjectType()
export class ProjectDonationSummaryView extends BaseEntity {
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
