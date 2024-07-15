import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project.js';
import { User } from './user.js';
import { ProjectVerificationForm } from './projectVerificationForm.js';

export const SOCIAL_NETWORKS = {
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  YOUTUBE: 'youtube',
  LINKEDIN: 'linkedin',
  DISCORD: 'discord',
  GOOGLE: 'google',
};

@Entity()
@ObjectType()
@Index(['socialNetworkId', 'socialNetwork'])
export class SocialProfile extends BaseEntity {
  /**
   * @see {@link https://github.com/Giveth/giveth-dapps-v2/issues/711#issuecomment-1128435255}
   */

  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @RelationId((socialProfile: SocialProfile) => socialProfile.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  user: User;
  @RelationId((socialProfile: SocialProfile) => socialProfile.user)
  userId: number;

  @Index()
  @Field(_type => ProjectVerificationForm)
  @ManyToOne(_type => ProjectVerificationForm)
  projectVerificationForm: ProjectVerificationForm;
  @RelationId(
    (socialProfile: SocialProfile) => socialProfile.projectVerificationForm,
  )
  projectVerificationFormId: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  socialNetworkId: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  name?: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  link?: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  socialNetwork: string;

  @Field()
  @Column('boolean', { default: false })
  isVerified: boolean;
}
