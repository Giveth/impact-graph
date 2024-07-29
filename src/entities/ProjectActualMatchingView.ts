import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  PrimaryColumn,
  BaseEntity,
  ViewEntity,
  ManyToOne,
  ViewColumn,
  JoinColumn,
  Relation,
} from 'typeorm';
import { Project } from './project.js';

@ViewEntity('project_actual_matching_view', { synchronize: false })
@ObjectType()
export class ProjectActualMatchingView extends BaseEntity {
  @Field(_type => Project)
  @ManyToOne(_type => Project, project => project.projectEstimatedMatchingView)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Relation<Project>;

  @Field()
  @ViewColumn()
  @PrimaryColumn()
  projectId: number;

  // QF Round ID associated with the donations
  @ViewColumn()
  @Field()
  @PrimaryColumn()
  qfRoundId: number;

  @ViewColumn()
  @Column({ nullable: true })
  email?: string;

  // Sum of the square root of the value in USD of the donations
  @ViewColumn()
  @Column('double precision')
  donationsSqrtRootSum: number;

  @ViewColumn()
  @Column('double precision')
  donationsSqrtRootSumSquared: number;

  // Count of unique donations per user per project per QF round
  @ViewColumn()
  @Column('int')
  uniqueQualifiedDonors: number;

  @ViewColumn()
  @Column('double precision')
  allUsdReceivedAfterSybilsAnalysis: number;

  @ViewColumn()
  @Column('double precision')
  allUsdReceived: number;

  @ViewColumn()
  @Column({ type: 'double precision', array: true })
  totalValuesOfUserDonationsAfterAnalysis: number[];

  @ViewColumn()
  @Column({ type: 'int', array: true })
  donationIdsBeforeAnalysis: number[];

  @ViewColumn()
  @Column({ type: 'int', array: true })
  donationIdsAfterAnalysis: number[];

  @ViewColumn()
  @Column({ type: 'int', array: true })
  uniqueUserIdsAfterAnalysis: number[];

  // Count of unique donors who have verified donations for each project
  @ViewColumn()
  @Column('int')
  totalDonors: number;

  @ViewColumn()
  @Column()
  slug: string;

  @ViewColumn()
  @Column()
  title: string;

  @ViewColumn()
  @Column()
  networkAddresses: string;

  // We fill it ourself before sending data to google sheet, it's not a DB column
  actualMatching: number;
}
