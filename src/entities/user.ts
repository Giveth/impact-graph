import { Field, ID, ObjectType, Int, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
  JoinTable,
} from 'typeorm';
import { Project, ProjStatus, ReviewStatus } from './project';
import { Donation, DONATION_STATUS } from './donation';
import { Reaction } from './reaction';
import { AccountVerification } from './accountVerification';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectVerificationForm } from './projectVerificationForm';
import { PowerBoosting } from './powerBoosting';
import { findPowerBoostingsCountByUserId } from '../repositories/powerBoostingRepository';

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
];

export enum UserRole {
  ADMIN = 'admin',
  RESTRICTED = 'restricted',
  OPERATOR = 'operator',
  VERIFICATION_FORM_REVIEWER = 'reviewer',
}

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESTRICTED,
  })
  role: UserRole;

  @Field(type => [AccountVerification], { nullable: true })
  @OneToMany(
    type => AccountVerification,
    accountVerification => accountVerification.user,
  )
  accountVerifications?: AccountVerification[];

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  email?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  firstName?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  lastName?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  name?: string;

  @Field(type => String, { nullable: true })
  @Column({ unique: true, length: 100 })
  walletAddress?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  encryptedPassword?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true })
  avatar?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  url?: string;

  @Field(type => String, { nullable: true })
  @Column({ nullable: true, length: 200 })
  location?: string;

  @Column()
  loginType: string;

  @Column({ nullable: true })
  dId?: string;

  @Column('bool', { default: false })
  confirmed: boolean;

  @Field(type => [Project])
  @ManyToMany(type => Project, project => project.users)
  @JoinTable()
  projects?: Project[];

  @Column('bool', { default: false })
  segmentIdentified: boolean;

  // Admin Reviewing Forms
  @Field(type => [ProjectVerificationForm], { nullable: true })
  @OneToMany(
    type => ProjectVerificationForm,
    projectVerificationForm => projectVerificationForm.reviewer,
  )
  projectVerificationForms?: ProjectVerificationForm[];

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalDonated: number;

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalReceived: number;

  @Field(type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.user,
  )
  projectStatusHistories?: ProjectStatusHistory[];

  @Field(type => [PowerBoosting], { nullable: true })
  @OneToMany(type => PowerBoosting, powerBoosting => powerBoosting.user)
  powerBoostings?: PowerBoosting[];

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Field(type => Int, { nullable: true })
  async projectsCount() {
    const projectsCount = await Project.createQueryBuilder('project')
      .where('project."admin" = :id', { id: String(this.id) })
      .getCount();

    return projectsCount;
  }

  @Field(type => Int, { nullable: true })
  async donationsCount() {
    const query = await Donation.createQueryBuilder('donation')
      .where(`donation."userId" = :id`, { id: this.id })
      .andWhere(`status = :status`, {
        status: DONATION_STATUS.VERIFIED,
      });

    return query.getCount();
  }

  @Field(type => Int, { nullable: true })
  async likedProjectsCount() {
    const likedProjectsCount = await Reaction.createQueryBuilder('reaction')
      .innerJoinAndSelect('reaction.project', 'project')
      .where('reaction.userId = :id', { id: this.id })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .getCount();

    return likedProjectsCount;
  }
  @Field(type => Int, { nullable: true })
  async boostedProjectsCount() {
    return findPowerBoostingsCountByUserId(this.id);
  }

  segmentUserId() {
    return `givethId-${this.id}`;
  }
}
