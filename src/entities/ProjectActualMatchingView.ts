import { Field, ObjectType } from 'type-graphql';
import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  BaseEntity,
  ViewEntity,
  ManyToOne,
  RelationId,
  ViewColumn,
  JoinColumn,
} from 'typeorm';
import { Project } from './project';
import { string } from 'joi';

@ViewEntity('project_actual_matching_view', { synchronize: false })
@ObjectType()
export class ProjectActualMatchingView extends BaseEntity {
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

  // We fill it ourself before sending data to google sheet, it's not a DB column
  actualMatching: number;
}
