import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, InterfaceType, ObjectType } from 'type-graphql';
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
  PROJECT_REGISTRY: 'projectRegistry',
  PROJECT_CONTACTS: 'projectContacts',
  MANAGING_FUNDS: 'managingFunds',
  MILESTONES: 'milestones',
  TERM_AND_CONDITION: 'termAndCondition',
  SUBMIT: 'submit',
};

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
  twitter?: string;
  @Field({ nullable: true })
  facebook?: string;
  @Field({ nullable: true })
  linkedin?: string;
  @Field({ nullable: true })
  instagram?: string;
  @Field({ nullable: true })
  youtube?: string;
}

@ObjectType()
export class Milestones {
  @Field({ nullable: true })
  foundationDate?: Date;
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
  @ManyToOne(type => Project, { eager: true })
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
  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  projectRegistry: ProjectRegistry;

  @Field(type => ProjectContacts, { nullable: true })
  @Column('jsonb', { nullable: true })
  projectContacts: ProjectContacts;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  milestones: Milestones;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  managingFunds: ManagingFunds;

  @Field({ nullable: true })
  @Column('boolean', { default: false, nullable: true })
  isTermAndConditionsAccepted?: boolean;
}
