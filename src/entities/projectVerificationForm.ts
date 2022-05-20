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
  TERM_AND_CONDITION: 'termAndCondition',
};

@InterfaceType()
export class ProjectRegistry {
  isNonProfitOrganization?: boolean;
  organizationCountry?: string;
  organizationWebsite?: string;
  organizaitonDescription?: string;
}

@InterfaceType()
export class ProjectContacts {
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
}

@InterfaceType()
export class Milestones {
  foundationDate?: Date;
  mission?: string;
  achievedMilestones?: string;
  achievedMilestonesProof?: string;
}

@InterfaceType()
export class ManagingFunds {
  description: string;
  relatedAddresses: {
    title: string;
    address: string;
    networkId: number;
  }[];
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

  @Field()
  @Column('text', { default: PROJECT_VERIFICATION_STATUSES.DRAFT })
  step: string;

  // https://github.com/typeorm/typeorm/issues/4674#issuecomment-618073862
  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  projectRegistry: ProjectRegistry;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  projectContacts: ProjectContacts;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  milestones: Milestones;

  @Field({ nullable: true })
  @Column('jsonb', { nullable: true })
  managingFunds: ManagingFunds;

  @Field()
  @Column('boolean', { default: false })
  isTermAndConditionsAccepted: boolean;
}
