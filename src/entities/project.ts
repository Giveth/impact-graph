import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  AfterInsert,
  AfterUpdate,
  BeforeUpdate,
  BeforeInsert,
  BaseEntity,
  BeforeRemove,
  Column,
  Entity,
  Index,
  LessThan,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  JoinTable,
} from 'typeorm';

import { Donation } from './donation';
import { Reaction } from './reaction';
import { User } from './user';
import { ProjectStatus } from './projectStatus';
import { Int } from 'type-graphql/dist/scalars/aliases';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectStatusReason } from './projectStatusReason';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Organization } from './organization';
import { findUserById } from '../repositories/userRepository';
import { SocialProfile } from './socialProfile';
import { ProjectVerificationForm } from './projectVerificationForm';
import { ProjectAddress } from './projectAddress';
import { ProjectContacts } from './projectVerificationForm';
import { ProjectPowerView } from '../views/projectPowerView';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { ProjectInstantPowerView } from '../views/projectInstantPowerView';
import { Category } from './category';
import { FeaturedUpdate } from './featuredUpdate';
import { getHtmlTextSummary } from '../utils/utils';

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

// Always use Enums to prevent sql injection with plain strings
export enum SortingField {
  MostFunded = 'MostFunded',
  MostLiked = 'MostLiked',
  Newest = 'Newest',
  RecentlyUpdated = 'RecentlyUpdated',
  Oldest = 'Oldest',
  QualityScore = 'QualityScore',
  GIVPower = 'GIVPower',
  InstantBoosting = 'InstantBoosting',
}

export enum FilterField {
  Verified = 'verified',
  AcceptGiv = 'givingBlocksId',
  AcceptFundOnGnosis = 'acceptFundOnGnosis',
  AcceptFundOnMainnet = 'acceptFundOnMainnet',
  AcceptFundOnPolygon = 'acceptFundOnPolygon',
  AcceptFundOnCelo = 'acceptFundOnCelo',
  AcceptFundOnOptimism = 'acceptFundOnOptimism',
  GivingBlock = 'fromGivingBlock',
  BoostedWithGivPower = 'boostedWithGivPower',
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
  GIVPower = 'givPower',
  InstantBoosting = 'instantBoosting',
}

export enum RevokeSteps {
  Reminder = 'reminder',
  Warning = 'warning',
  LastChance = 'lastChance',
  UpForRevoking = 'upForRevoking', // exceeded last chance and revoked dates case
  Revoked = 'revoked',
}
export enum ReviewStatus {
  NotReviewed = 'Not Reviewed',
  Listed = 'Listed',
  NotListed = 'Not Listed',
}

@Entity()
@ObjectType()
export class Project extends BaseEntity {
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
  descriptionSummary?: string;

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
  creationDate: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  updatedAt: Date;

  @Field(type => Organization)
  @ManyToOne(type => Organization)
  @JoinTable()
  organization: Organization;

  @RelationId((project: Project) => project.organization)
  @Column({ nullable: true })
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
  })
  @JoinTable()
  categories: Category[];

  @Field(type => Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0;

  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string;

  @Field({ nullable: true })
  @Column({ unique: true, nullable: true })
  walletAddress?: string;

  @Field(type => Boolean)
  @Column()
  verified: boolean;

  @Field(type => String, { nullable: true })
  @Column('text', { nullable: true })
  verificationStatus?: string | null;

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

  @Field(type => [ProjectContacts], { nullable: true })
  @Column('jsonb', { nullable: true })
  contacts: ProjectContacts[];

  @ManyToMany(type => User, user => user.projects)
  @Field(type => [User], { nullable: true })
  @JoinTable()
  users: User[];

  @Field(() => [Reaction], { nullable: true })
  @OneToMany(type => Reaction, reaction => reaction.project)
  reactions?: Reaction[];

  @Field(type => [ProjectAddress], { nullable: true })
  @OneToMany(type => ProjectAddress, projectAddress => projectAddress.project, {
    eager: true,
  })
  addresses?: ProjectAddress[];

  @Index()
  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus)
  status: ProjectStatus;
  @RelationId((project: Project) => project.status)
  @Column({ nullable: true })
  statusId: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(() => User, { eager: true })
  adminUser: User;

  @Column({ nullable: true })
  @RelationId((project: Project) => project.adminUser)
  adminUserId: number;

  @Field(type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.project,
  )
  statusHistory?: ProjectStatusHistory[];

  @Field(type => ProjectVerificationForm, { nullable: true })
  @OneToOne(
    type => ProjectVerificationForm,
    projectVerificationForm => projectVerificationForm.project,
    { nullable: true },
  )
  projectVerificationForm?: ProjectVerificationForm;

  @Field(type => FeaturedUpdate, { nullable: true })
  @OneToOne(type => FeaturedUpdate, featuredUpdate => featuredUpdate.project, {
    nullable: true,
  })
  featuredUpdate?: FeaturedUpdate;

  @Field(type => ProjectPowerView, { nullable: true })
  @OneToOne(
    type => ProjectPowerView,
    projectPowerView => projectPowerView.project,
  )
  projectPower?: ProjectPowerView;

  @Field(type => ProjectFuturePowerView, { nullable: true })
  @OneToOne(
    type => ProjectFuturePowerView,
    projectFuturePowerView => projectFuturePowerView.project,
  )
  projectFuturePower?: ProjectFuturePowerView;

  @Field(type => ProjectInstantPowerView, { nullable: true })
  @OneToOne(
    type => ProjectInstantPowerView,
    projectInstantPowerView => projectInstantPowerView.project,
  )
  projectInstantPower?: ProjectInstantPowerView;

  @Field(type => String, { nullable: true })
  verificationFormStatus?: string;

  @Field(type => [SocialProfile], { nullable: true })
  @OneToMany(type => SocialProfile, socialProfile => socialProfile.project)
  socialProfiles?: SocialProfile[];

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

  @Field(type => String)
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.NotReviewed,
  })
  reviewStatus: ReviewStatus;

  @Field(type => String, { nullable: true })
  projectUrl?: string;

  // Virtual attribute to subquery result into
  @Field(type => Int, { nullable: true })
  prevStatusId?: number;

  // Virtual attribute for projectUpdate
  @Field(type => ProjectUpdate, { nullable: true })
  projectUpdate?: any;

  @Field(type => [ProjectUpdate], { nullable: true })
  projectUpdates?: ProjectUpdate[];

  @Field(type => String, { nullable: true })
  adminJsBaseUrl: string;

  // User reaction to the project
  @Field({ nullable: true })
  reaction?: Reaction;
  /**
   * Custom Query Builders to chain together
   */

  // only projects with status active can be listed automatically
  static pendingReviewSince(maximumDaysForListing: Number) {
    const maxDaysForListing = moment()
      .subtract(maximumDaysForListing, 'days')
      .endOf('day');

    return this.createQueryBuilder('project')
      .where({ updatedAt: LessThan(maxDaysForListing) })
      .andWhere('project.reviewStatus = :reviewStatus', {
        reviewStatus: ReviewStatus.NotReviewed,
      })
      .andWhere('project.statusId = :statusId', { statusId: ProjStatus.active })
      .getMany();
  }

  static async addProjectStatusHistoryRecord(inputData: {
    prevStatus?: ProjectStatus;
    status: ProjectStatus;
    project: Project;
    reasonId?: number;
    description?: string;
    userId?: number;
  }) {
    const { project, status, prevStatus, description, reasonId, userId } =
      inputData;
    let reason;
    let user;

    if (userId) {
      user = await findUserById(userId);
    }

    if (reasonId) {
      reason = await ProjectStatusReason.findOne({
        where: { id: reasonId, statusId: status.id },
      });
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
        i18n.__(
          translationErrorMessagesKeys.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
        ),
      );
    }

    if (user.id === this.adminUser?.id) {
      return true;
    } else {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
        ),
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

  @BeforeUpdate()
  async updateProjectDescriptionSummary() {
    await Project.update(
      { id: this.id },
      { descriptionSummary: getHtmlTextSummary(this.description) },
    );
  }

  @BeforeInsert()
  setProjectDescriptionSummary() {
    this.descriptionSummary = getHtmlTextSummary(this.description);
  }
}

@Entity()
@ObjectType()
export class ProjectUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(type => String)
  @Column()
  title: string;

  // Virtual attribute for projectUpdate
  @Field(type => String, { nullable: true })
  projectTitle?: string;

  // Virtual attribute for projectUpdate
  @Field(type => String, { nullable: true })
  projectSlug?: string;

  @Field(type => ID)
  @Column()
  projectId: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field(type => String)
  @Column()
  content: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  contentSummary?: string;

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

  // Project oneToOne as virtual attribute as relation was not set properly
  @Field(type => Project, { nullable: true })
  project?: Project;

  @Field()
  @Column('boolean', { default: false })
  isNonProfitOrganization: boolean;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  organizationCountry: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  organizationWebsite: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  organizationDescription: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  twitter: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  facebook: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  linkedin: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  instagram: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  youtube: string;

  @Column({ nullable: true })
  foundationDate: Date;

  @Column('text', { nullable: true })
  mission: string;

  @Column('text', { nullable: true })
  achievedMilestones: string;

  @Column('text', { nullable: true })
  managingFundDescription: string;

  @Field(type => FeaturedUpdate, { nullable: true })
  @OneToOne(
    type => FeaturedUpdate,
    featuredUpdate => featuredUpdate.projectUpdate,
    { nullable: true },
  )
  featuredUpdate?: FeaturedUpdate;

  // does not call with createQueryBuilder
  @AfterInsert()
  async updateProjectStampOnCreation() {
    await Project.update({ id: this.projectId }, { updatedAt: new Date() });
  }

  @AfterUpdate()
  async updateProjectStampOnUpdate() {
    await Project.update({ id: this.projectId }, { updatedAt: new Date() });
  }

  @BeforeRemove()
  async updateProjectStampOnDeletion() {
    await Project.update({ id: this.projectId }, { updatedAt: new Date() });
  }

  @BeforeUpdate()
  async updateProjectUpdateContentSummary() {
    await ProjectUpdate.update(
      { id: this.id },
      { contentSummary: getHtmlTextSummary(this.content) },
    );
  }

  @BeforeInsert()
  setProjectUpdateContentSummary() {
    this.contentSummary = getHtmlTextSummary(this.content);
  }
}
