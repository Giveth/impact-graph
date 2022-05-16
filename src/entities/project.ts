import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  AfterInsert,
  AfterUpdate,
  BaseEntity,
  BeforeRemove,
  Brackets,
  Column,
  Entity,
  Index,
  JoinTable,
  LessThan,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

import { Donation } from './donation';
import { Reaction } from './reaction';
import { Category } from './category';
import { User } from './user';
import { ProjectStatus } from './projectStatus';
import ProjectTracker from '../services/segment/projectTracker';
import { SegmentEvents } from '../analytics/analytics';
import { Int } from 'type-graphql/dist/scalars/aliases';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectStatusReason } from './projectStatusReason';
import { errorMessages } from '../utils/errorMessages';
import { Organization } from './organization';
import { findUserById } from '../repositories/userRepository';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

export enum ProjStatus {
  rejected = 1,
  pending = 2,
  clarification = 3,
  verification = 4,
  active = 5,
  deactive = 6,
  cancelled = 7,
  drafted = 8,
}

export enum OrderField {
  CreationDate = 'creationDate',
  CreationAt = 'createdAt',
  UpdatedAt = 'updatedAt',

  // TODO We may can delete this sorting
  Balance = 'balance',

  QualityScore = 'qualityScore',
  Verified = 'verified',
  Reactions = 'totalReactions',
  Traceable = 'traceCampaignId',
  Donations = 'totalDonations',
  TraceDonations = 'totalTraceDonations',
  AcceptGiv = 'givingBlocksId',
}

@Entity()
@ObjectType()
class Project extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  title: string;

  @Index()
  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @Index()
  @Field(type => [String], { nullable: true })
  @Column('text', { array: true, default: '{}' })
  slugHistory?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  admin?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  traceCampaignId?: string;

  @Index({ unique: true, where: '"givingBlocksId" IS NOT NULL' })
  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  givingBlocksId?: string;

  @Index({ unique: true, where: '"changeId" IS NOT NULL' })
  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  changeId?: string;

  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  website?: string;

  @Field({ nullable: true })
  @Column({ default: null, nullable: true })
  youtube?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  organisationId?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  creationDate: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  updatedAt: Date;

  @Field(type => Organization)
  @ManyToOne(type => Organization, {
    eager: true,
  })
  @JoinTable()
  organization: Organization;

  @RelationId((project: Project) => project.organization)
  organizationId: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  coOrdinates?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  impactLocation?: string;

  @Field(type => [Category], { nullable: true })
  @ManyToMany(type => Category, category => category.projects, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  @JoinTable()
  categories: Category[];

  @Field(type => Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0;

  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string;

  @Field()
  @Column({ unique: true })
  walletAddress?: string;

  @Field(type => Boolean)
  @Column()
  verified: boolean;

  @Field(type => Boolean, { nullable: true })
  @Column({ default: false })
  isImported: boolean;

  @Field(type => Boolean)
  @Column()
  giveBacks: boolean;

  @Field(type => [Donation], { nullable: true })
  @OneToMany(type => Donation, donation => donation.project)
  donations?: Donation[];

  @Field(type => Float, { nullable: true })
  @Column({ nullable: true })
  qualityScore: number = 0;

  @ManyToMany(type => User, user => user.projects, { eager: true })
  @JoinTable()
  @Field(type => [User], { nullable: true })
  users: User[];

  @OneToMany(type => Reaction, reaction => reaction.project)
  reactions?: Reaction[];

  @Index()
  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus, { eager: true })
  status: ProjectStatus;

  @Field(type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.project,
  )
  statusHistory?: ProjectStatusHistory[];

  @RelationId((project: Project) => project.status)
  statusId: number;

  @Field(type => Float)
  @Column({ type: 'real' })
  totalDonations: number;

  @Field(type => Float)
  @Column({ type: 'real', default: 0 })
  totalTraceDonations: number;

  @Field(type => Int, { defaultValue: 0 })
  @Column({ type: 'integer', default: 0 })
  totalReactions: number;

  @Field(type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  totalProjectUpdates: number;

  @Field(type => Boolean, { nullable: true })
  @Column({ type: 'boolean', default: null, nullable: true })
  listed?: boolean | null;

  // Virtual attribute to subquery result into
  @Field(type => User, { nullable: true })
  adminUser?: User;

  // Virtual attribute to subquery result into
  @Field(type => Int, { nullable: true })
  prevStatusId?: number;

  // User reaction to the project
  @Field(type => Reaction, { nullable: true })
  reaction?: Reaction;
  /**
   * Custom Query Builders to chain together
   */

  static notifySegment(project: Project, eventName: SegmentEvents) {
    new ProjectTracker(project, eventName).track();
  }

  static sendBulkEventsToSegment(
    projects: [Project],
    eventName: SegmentEvents,
  ) {
    for (const project of projects) {
      this.notifySegment(project, eventName);
    }
  }

  // only projects with status active can be listed automatically
  static pendingReviewSince(maximumDaysForListing: Number) {
    const maxDaysForListing = moment()
      .subtract(maximumDaysForListing, 'days')
      .endOf('day');

    return this.createQueryBuilder('project')
      .where({ updatedAt: LessThan(maxDaysForListing) })
      .andWhere('project.listed IS NULL')
      .andWhere('project.statusId = :statusId', { statusId: ProjStatus.active })
      .getMany();
  }

  static async addProjectStatusHistoryRecord(inputData: {
    prevStatus?: ProjectStatus;
    status: ProjectStatus;
    project: Project;
    reasonId?: number;
    description?: string;
    userId: number;
  }) {
    const { project, status, prevStatus, description, reasonId, userId } =
      inputData;
    let reason;
    const user = await findUserById(userId);

    if (reasonId) {
      reason = await ProjectStatusReason.findOne({ id: reasonId, status });
    }
    if (reasonId) {
      reason = await ProjectStatusReason.findOne({ id: reasonId, status });
    }

    await ProjectStatusHistory.create({
      project,
      status,
      prevStatus,
      reason,
      user,
      description,
      createdAt: new Date(),
    }).save();
  }

  // Status 7 is deleted status
  mayUpdateStatus(user: User) {
    if (this.statusId === ProjStatus.cancelled) {
      throw new Error(
        errorMessages.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
      );
    }

    if (
      this.users.filter(o => o.id === user.id).length > 0 ||
      user.id === Number(this.admin)
    ) {
      return true;
    } else {
      throw new Error(
        errorMessages.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
      );
    }
  }

  /**
   * Add / remove a heart to the score
   * @param loved true to add a heart, false to remove
   */
  updateQualityScoreHeart(loved: boolean) {
    // TODO should remove this, we should have a function to calculate score from scratch everytime
    if (loved) {
      this.qualityScore = this.qualityScore + 10;
    } else {
      this.qualityScore = this.qualityScore - 10;
    }
  }

  owner() {
    return this.users[0];
  }
}

@Entity()
@ObjectType()
class ProjectUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => String)
  @Column()
  title: string;

  @Field(type => ID)
  @Column()
  projectId: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field(type => String)
  @Column()
  content: string;

  @Field(type => Date)
  @Column()
  createdAt: Date;

  @Field(type => Boolean)
  @Column({ nullable: true })
  isMain: boolean;

  @Field(type => Int, { defaultValue: 0 })
  @Column({ type: 'integer', default: 0 })
  totalReactions: number;

  // User reaction to the project update
  @Field(type => Reaction, { nullable: true })
  reaction?: Reaction;

  // does not call with createQueryBuilder
  @AfterInsert()
  async updateProjectStampOnCreation() {
    await Project.update({ id: this.projectId }, { updatedAt: moment() });
  }

  @BeforeRemove()
  async updateProjectStampOnDeletion() {
    await Project.update({ id: this.projectId }, { updatedAt: moment() });
  }
}

export { Project, Category, ProjectUpdate };
