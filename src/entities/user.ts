import { Field, Float, ID, Int, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjStatus, ReviewStatus } from './project';
import { Donation, DONATION_STATUS } from './donation';
import { Reaction } from './reaction';
import { AccountVerification } from './accountVerification';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectVerificationForm } from './projectVerificationForm';
import { ReferredEvent } from './referredEvent';
import { NOTIFICATIONS_EVENT_NAMES } from '../analytics/analytics';

export const publicSelectionFields = [
  'user.id',
  'user.walletAddress',
  'user.name',
  'user.firstName',
  'user.lastName',
  'user.url',
  'user.avatar',
  'user.totalDonated',
  'user.totalReceived',
  'user.passportScore',
  'user.passportStamps',
];

export enum UserRole {
  // Normal users, not admin
  RESTRICTED = 'restricted',

  ADMIN = 'admin',
  OPERATOR = 'operator',
  VERIFICATION_FORM_REVIEWER = 'reviewer',
  CAMPAIGN_MANAGER = 'campaignManager',
  QF_MANAGER = 'qfManager',
}

export type UserStreamBalanceWarning =
  | NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_MONTH
  | NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_WEEK
  | NOTIFICATIONS_EVENT_NAMES.SUPER_TOKENS_BALANCE_DEPLETED;

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESTRICTED,
  })
  role: UserRole;

  @Field(_type => [AccountVerification], { nullable: true })
  @OneToMany(
    _type => AccountVerification,
    accountVerification => accountVerification.user,
  )
  accountVerifications?: AccountVerification[];

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  email?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  firstName?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  @Index('trgm_idx_user_name', { synchronize: false })
  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true, unique: true })
  walletAddress?: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  streamBalanceWarning?: Record<string, UserStreamBalanceWarning | null>;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  encryptedPassword?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  avatar?: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  url?: string;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: null })
  passportScore?: number;

  @Field(_type => Number, { nullable: true })
  @Column({ nullable: true, default: null })
  passportStamps?: number;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  location?: string;

  @Column()
  loginType: string;

  @Column({ nullable: true })
  dId?: string;

  @Column('bool', { default: false })
  confirmed: boolean;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  chainvineId?: string;

  @Field(_type => Boolean, { nullable: true })
  @Column('bool', { default: false })
  wasReferred: boolean;

  @Field(_type => Boolean, { nullable: true })
  @Column('bool', { default: false })
  isReferrer: boolean;

  @Field(() => ReferredEvent, { nullable: true })
  @OneToOne(() => ReferredEvent, referredEvent => referredEvent.user, {
    cascade: true,
  })
  referredEvent?: ReferredEvent;

  @Column('bool', { default: false })
  segmentIdentified: boolean;

  // Admin Reviewing Forms
  @Field(_type => [ProjectVerificationForm], { nullable: true })
  @OneToMany(
    _type => ProjectVerificationForm,
    projectVerificationForm => projectVerificationForm.reviewer,
  )
  projectVerificationForms?: ProjectVerificationForm[];

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalDonated: number;

  @Field(_type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalReceived: number;

  @Field(_type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    _type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.user,
  )
  projectStatusHistories?: ProjectStatusHistory[];

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Field(_type => Int, { nullable: true })
  projectsCount?: number;

  @Field(_type => Float, { nullable: true })
  activeQFMBDScore?: number;

  @Field(_type => Boolean, { nullable: false })
  @Column({ default: false })
  emailConfirmed: boolean;

  @Field(_type => Boolean, { nullable: false })
  @Column({ default: false })
  emailConfirmationSent: boolean;

  @Field(_type => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  emailConfirmationSentAt: Date | null;

  @Field(_type => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  emailConfirmedAt: Date | null;

  @Field(_type => Int, { nullable: true })
  async donationsCount() {
    return await Donation.createQueryBuilder('donation')
      .where(`donation."userId" = :userId`, { userId: this.id })
      .andWhere(`donation.status = :status`, {
        status: DONATION_STATUS.VERIFIED,
      })
      .cache(
        `user-donationsCount-normal-${this.id}`,
        Number(process.env.USER_STATS_CACHE_TIME || 60000),
      )
      .getCount();
  }

  @Field(_type => Int, { nullable: true })
  async likedProjectsCount() {
    const likedProjectsCount = await Reaction.createQueryBuilder('reaction')
      .innerJoinAndSelect('reaction.project', 'project')
      .where('reaction.userId = :id', { id: this.id })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .cache(
        `user-likedProjectsCount-${this.id}`,
        Number(process.env.USER_STATS_CACHE_TIME || 60000),
      )
      .getCount();

    return likedProjectsCount;
  }

  segmentUserId() {
    return `givethId-${this.id}`;
  }
}
