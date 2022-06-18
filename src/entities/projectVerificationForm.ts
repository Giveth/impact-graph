import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';
import { SocialProfile } from './socialProfile';

export const PROJECT_VERIFICATION_STATUSES = {
  VERIFIED: 'verified',
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
};

export const PROJECT_VERIFICATION_STEPS = {
  // Order of these steps are important, please see https://github.com/Giveth/giveth-dapps-v2/issues/893
  PERSONAL_INFO: 'personalInfo',
  PROJECT_REGISTRY: 'projectRegistry',
  PROJECT_CONTACTS: 'projectContacts',
  MANAGING_FUNDS: 'managingFunds',
  MILESTONES: 'milestones',
  TERM_AND_CONDITION: 'termAndCondition',
  // SUBMIT: 'submit',
};

// Representative of the project, no specifically the user
@ObjectType()
export class PersonalInfo {
  @Field({ nullable: true })
  fullName?: string;
  @Field({ nullable: true })
  walletAddress?: string;
  @Field({ nullable: true })
  email?: string;
}

@ObjectType()
export class ProjectRegistry {
  @Field({ nullable: true })
  isNonProfitOrganization?: boolean;
  @Field({ nullable: true })
  organizationCountry?: string;
  @Field({ nullable: true })
  organizationWebsite?: string;
  @Field({ nullable: true })
  organizationDescription?: string;
}

@ObjectType()
export class ProjectContacts {
  @Field({ nullable: true })
  name?: string;
  @Field({ nullable: true })
  url?: string;
}

@ObjectType()
export class Milestones {
  @Field(type => String, { nullable: true })
  foundationDate?: String;

  @Field({ nullable: true })
  mission?: string;
  @Field({ nullable: true })
  achievedMilestones?: string;
  @Field({ nullable: true })
  achievedMilestonesProof?: string;
}

@ObjectType()
export class RelatedAddress {
  @Field({ nullable: true })
  title: string;
  @Field({ nullable: true })
  address: string;
  @Field({ nullable: true })
  networkId: number;
}

@ObjectType()
export class ManagingFunds {
  @Field({ nullable: true })
  description: string;

  @Field(() => [RelatedAddress], { nullable: true })
  relatedAddresses: RelatedAddress[];
}

@Entity()
@ObjectType()
export class ProjectVerificationForm extends BaseEntity {
  /**
   * @see {@link https://github.com/Giveth/giveth-dapps-v2/issues/711#issuecomment-1130001342}
   */

  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => Project)
  @OneToOne(type => Project, { eager: true })
  @JoinColumn()
  project: Project;

  @RelationId(
    (projectVerificationForm: ProjectVerificationForm) =>
      projectVerificationForm.project,
  )
  projectId: number;

  @Index()
  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  user: User;
  @RelationId(
    (projectVerificationForm: ProjectVerificationForm) =>
      projectVerificationForm.user,
  )
  userId: number;

  @Field(type => [SocialProfile], { nullable: true })
  @OneToMany(
    type => SocialProfile,
    socialProfile => socialProfile.projectVerificationForm,
  )
  socialProfiles?: SocialProfile[];

  @Field()
  @Column('text', { default: PROJECT_VERIFICATION_STATUSES.DRAFT })
  status: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // https://github.com/typeorm/typeorm/issues/4674#issuecomment-618073862
  @Field(type => PersonalInfo, { nullable: true })
  @Column('jsonb', { nullable: true })
  personalInfo: PersonalInfo;

  @Field(type => ProjectRegistry, { nullable: true })
  @Column('jsonb', { nullable: true })
  projectRegistry: ProjectRegistry;

  @Field(type => [ProjectContacts], { nullable: true })
  @Column('jsonb', { nullable: true })
  projectContacts: ProjectContacts[];

  @Field(type => Milestones, { nullable: true })
  @Column('jsonb', { nullable: true })
  milestones: Milestones;

  @Field(type => ManagingFunds, { nullable: true })
  @Column('jsonb', { nullable: true })
  managingFunds: ManagingFunds;

  @Field(type => String, { nullable: true })
  @Column('text', { nullable: true })
  lastStep: string | null;

  @Field(type => Boolean, { nullable: false })
  @Column({ default: false })
  emailConfirmed: boolean;

  @Field(type => String, { nullable: true })
  @Column('text', { nullable: true })
  email?: string;

  @Field(type => String, { nullable: true })
  @Column('text', { nullable: true })
  emailConfirmationToken: string | null;

  @Field(type => Date, { nullable: true })
  @Column('timestamptz', { nullable: true })
  emailConfirmationTokenExpiredAt: Date | null;

  @Field(type => Boolean, { nullable: true })
  @Column({ default: false })
  emailConfirmationSent: boolean;

  @Field(type => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  emailConfirmationSentAt: Date | null;

  @Field(type => Date, { nullable: true })
  @Column({ nullable: true })
  emailConfirmedAt: Date;

  @Field({ nullable: true })
  @Column('boolean', { default: false, nullable: true })
  isTermAndConditionsAccepted?: boolean;
}
