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

import { Int } from 'type-graphql/dist/scalars/aliases';
import { Donation } from './donation';
import { Reaction } from './reaction';
import { User } from './user';
import { ProjectStatus } from './projectStatus';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectStatusReason } from './projectStatusReason';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { Organization } from './organization';
import { findUserById } from '../repositories/userRepository';
import { SocialProfile } from './socialProfile';
import { ProjectVerificationForm } from './projectVerificationForm';
import { ProjectAddress } from './projectAddress';
import { ProjectContacts } from './projectVerificationForm';
import { Category } from './category';
import { FeaturedUpdate } from './featuredUpdate';
import { getHtmlTextSummary } from '../utils/utils';
import { QfRound } from './qfRound';
import {
  getQfRoundTotalSqrtRootSumSquared,
  getProjectDonationsSqrtRootSum,
  findActiveQfRound,
} from '../repositories/qfRoundRepository';
import { EstimatedMatching } from '../types/qfTypes';
import { Campaign } from './campaign';
import { ProjectEstimatedMatchingView } from './ProjectEstimatedMatchingView';
import { ProjectSocialMedia } from './projectSocialMedia';
// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  ActiveQfRoundRaisedFunds = 'ActiveQfRoundRaisedFunds',
  EstimatedMatching = 'EstimatedMatching',
}

export enum FilterField {
  Verified = 'verified',
  AcceptGiv = 'givingBlocksId',
  AcceptFundOnGnosis = 'acceptFundOnGnosis',
  AcceptFundOnMainnet = 'acceptFundOnMainnet',
  AcceptFundOnPolygon = 'acceptFundOnPolygon',
  AcceptFundOnETC = 'acceptFundOnETC',
  AcceptFundOnCelo = 'acceptFundOnCelo',
  AcceptFundOnArbitrum = 'acceptFundOnArbitrum',
  AcceptFundOnBase = 'acceptFundOnBase',
  AcceptFundOnZKEVM = 'acceptFundOnZKEVM',
  AcceptFundOnOptimism = 'acceptFundOnOptimism',
  AcceptFundOnSolana = 'acceptFundOnSolana',
  Endaoment = 'fromEndaoment',
  ActiveQfRound = 'ActiveQfRound',
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
  Donations = 'totalDonations',
  TraceDonations = 'totalTraceDonations',
  AcceptGiv = 'givingBlocksId',
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
@ObjectType()
class ProjectTeamMember {
  @Field()
  name: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  twitter?: string;

  @Field({ nullable: true })
  linkedin?: string;

  @Field({ nullable: true })
  farcaster?: string;
}

@ObjectType()
export class Abc {
  @Field()
  tokenName: string;
  @Field()
  tokenTicker: string;
  @Field()
  issuanceTokenAddress: string;
  @Field()
  icon: string;
  @Field()
  orchestratorAddress: string;
  @Field()
  projectAddress: string;
}

@Entity()
@ObjectType()
@Index('trgm_idx_project_title', { synchronize: false })
@Index('trgm_idx_project_description', { synchronize: false })
export class Project extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  title: string;

  @Index({ unique: true })
  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @Index()
  @Field(_type => [String], { nullable: true })
  @Column('text', { array: true, default: '{}' })
  slugHistory?: string[];

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

  @Field({ nullable: true })
  @Column({ nullable: true })
  latestUpdateCreationDate: Date;

  @Field(_type => Organization)
  @ManyToOne(_type => Organization)
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
  teaser?: string;

  @Field(_ => [ProjectTeamMember], { nullable: true })
  @Column('jsonb', { nullable: true })
  teamMembers: ProjectTeamMember[];

  @Field(_ => Abc, { nullable: true })
  @Column('jsonb', { nullable: true })
  abc: Abc;

  @Index('trgm_idx_project_impact_location', { synchronize: false })
  @Field({ nullable: true })
  @Column({ nullable: true })
  impactLocation?: string;

  @Field(_type => [Category], { nullable: true })
  @ManyToMany(_type => Category, category => category.projects, {
    nullable: true,
  })
  @JoinTable()
  categories: Category[];

  @Field(_type => [QfRound], { nullable: true })
  @ManyToMany(_type => QfRound, qfRound => qfRound.projects, {
    nullable: true,
  })
  @JoinTable()
  qfRounds: QfRound[];

  @Field(_type => Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0;

  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string;

  @Field({ nullable: true })
  @Column({ unique: true, nullable: true })
  walletAddress?: string;

  @Field(_type => Boolean)
  @Column()
  verified: boolean;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  verificationStatus?: string | null;

  @Field(_type => Boolean, { nullable: true })
  @Column({ default: false })
  isImported: boolean;

  @Field(_type => Boolean)
  @Column()
  giveBacks: boolean;

  @Field(_type => [Donation], { nullable: true })
  @OneToMany(_type => Donation, donation => donation.project)
  donations?: Donation[];

  @Field(_type => Float, { nullable: true })
  @Column({ nullable: true })
  qualityScore: number = 0;

  @Field(_type => [ProjectContacts], { nullable: true })
  @Column('jsonb', { nullable: true })
  contacts: ProjectContacts[];

  @Field(() => [Reaction], { nullable: true })
  @OneToMany(_type => Reaction, reaction => reaction.project)
  reactions?: Reaction[];

  @Field(_type => [ProjectAddress], { nullable: true })
  @OneToMany(
    _type => ProjectAddress,
    projectAddress => projectAddress.project,
    {
      eager: true,
    },
  )
  addresses?: ProjectAddress[];

  @Field(_type => [ProjectSocialMedia], { nullable: true })
  @OneToMany(_type => ProjectSocialMedia, socialMedia => socialMedia.project, {
    eager: true,
  })
  socialMedia?: ProjectSocialMedia[];

  @Index()
  @Field(_type => ProjectStatus)
  @ManyToOne(_type => ProjectStatus)
  status: ProjectStatus;
  @RelationId((project: Project) => project.status)
  @Column({ nullable: true })
  statusId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(() => User, { eager: true })
  adminUser: User;

  @Column({ nullable: true })
  @Field(_type => Int)
  @RelationId((project: Project) => project.adminUser)
  adminUserId: number;

  @Field(_type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    _type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.project,
  )
  statusHistory?: ProjectStatusHistory[];

  @Field(_type => ProjectVerificationForm, { nullable: true })
  @OneToOne(
    _type => ProjectVerificationForm,
    projectVerificationForm => projectVerificationForm.project,
    { nullable: true },
  )
  projectVerificationForm?: ProjectVerificationForm;

  @Field(_type => FeaturedUpdate, { nullable: true })
  @OneToOne(_type => FeaturedUpdate, featuredUpdate => featuredUpdate.project, {
    nullable: true,
  })
  featuredUpdate?: FeaturedUpdate;

  @Field(_type => String, { nullable: true })
  verificationFormStatus?: string;

  @Field(_type => [SocialProfile], { nullable: true })
  @OneToMany(_type => SocialProfile, socialProfile => socialProfile.project)
  socialProfiles?: SocialProfile[];

  @Field(_type => [ProjectEstimatedMatchingView], { nullable: true })
  @OneToMany(
    _type => ProjectEstimatedMatchingView,
    projectEstimatedMatchingView => projectEstimatedMatchingView.project,
  )
  projectEstimatedMatchingView?: ProjectEstimatedMatchingView[];

  @Field(_type => Float)
  @Column({ type: 'real' })
  totalDonations: number;

  @Field(_type => Float)
  @Column({ type: 'real', default: 0 })
  totalTraceDonations: number;

  @Field(_type => Int, { defaultValue: 0 })
  @Column({ type: 'integer', default: 0 })
  totalReactions: number;

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  totalProjectUpdates: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  sumDonationValueUsdForActiveQfRound: number;

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  countUniqueDonorsForActiveQfRound: number;

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  countUniqueDonors: number;

  @Field(_type => Boolean, { nullable: true })
  @Column({ type: 'boolean', default: null, nullable: true })
  listed?: boolean | null;

  // @Field(_type => Boolean, { nullable: true })
  // @Column({ type: 'boolean', default: false })
  // tunnableQf?: boolean;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.NotReviewed,
  })
  reviewStatus: ReviewStatus;

  @Field(_type => String, { nullable: true })
  projectUrl?: string;

  // Virtual attribute to subquery result into
  @Field(_type => Int, { nullable: true })
  prevStatusId?: number;

  // Virtual attribute for projectUpdate
  @Field(_type => ProjectUpdate, { nullable: true })
  projectUpdate?: any;

  @Field(_type => [ProjectUpdate], { nullable: true })
  @OneToMany(() => ProjectUpdate, projectUpdate => projectUpdate.project)
  projectUpdates?: ProjectUpdate[];

  @Field(_type => String, { nullable: true })
  adminJsBaseUrl: string;

  // User reaction to the project
  @Field({ nullable: true })
  reaction?: Reaction;

  @Field(_type => [Campaign], { nullable: true })
  campaigns: Campaign[];

  // only projects with status active can be listed automatically
  static pendingReviewSince(maximumDaysForListing: number) {
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

  // In your main class
  @Field(_type => EstimatedMatching, { nullable: true })
  async estimatedMatching(): Promise<EstimatedMatching | null> {
    const activeQfRound = await findActiveQfRound();
    if (!activeQfRound) {
      // TODO should move it to materialized view
      return null;
    }
    const projectDonationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
      this.id,
      activeQfRound.id,
    );

    const allProjectsSum = await getQfRoundTotalSqrtRootSumSquared(
      activeQfRound.id,
    );

    const matchingPool = activeQfRound.allocatedFund;

    return {
      projectDonationsSqrtRootSum,
      allProjectsSum,
      matchingPool,
    };
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
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index('trgm_idx_project_title', { synchronize: false })
  @Field(_type => String)
  @Column()
  title: string;

  // Virtual attribute for projectUpdate
  @Field(_type => String, { nullable: true })
  projectTitle?: string;

  // Virtual attribute for projectUpdate
  @Field(_type => String, { nullable: true })
  projectSlug?: string;

  @Field(_type => ID)
  @Column()
  projectId: number;

  @Field(_type => ID)
  @Column()
  userId: number;

  @Field(_type => String)
  @Column()
  content: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  contentSummary?: string;

  @Field(_type => Date)
  @Column()
  createdAt: Date;

  @Field(_type => Boolean)
  @Column({ nullable: true })
  isMain: boolean;

  @Field(_type => Int, { defaultValue: 0 })
  @Column({ type: 'integer', default: 0 })
  totalReactions: number;

  // User reaction to the project update
  @Field(_type => Reaction, { nullable: true })
  reaction?: Reaction;

  // Project oneToOne as virtual attribute as relation was not set properly
  @Field(_type => Project, { nullable: true })
  @ManyToOne(() => Project, project => project.projectUpdates)
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

  @Index('trgm_idx_project_description', { synchronize: false })
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

  @Field(_type => FeaturedUpdate, { nullable: true })
  @OneToOne(
    _type => FeaturedUpdate,
    featuredUpdate => featuredUpdate.projectUpdate,
    { nullable: true },
  )
  featuredUpdate?: FeaturedUpdate;

  // does not call with createQueryBuilder
  @AfterInsert()
  async updateProjectStampOnCreation() {
    await Project.update(
      { id: this.projectId },
      { updatedAt: new Date(), latestUpdateCreationDate: new Date() },
    );
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
