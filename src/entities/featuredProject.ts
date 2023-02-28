import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  AfterInsert,
  AfterUpdate,
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
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
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
import { Category } from './category';
import { Project, ProjectUpdate } from './project';

@Entity()
@ObjectType()
export class FeaturedProject extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => Project)
  @OneToOne(type => Project)
  @JoinColumn()
  project: Project;

  @RelationId((featuredProject: FeaturedProject) => featuredProject.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(type => ProjectUpdate)
  @OneToOne(type => ProjectUpdate)
  @JoinColumn()
  projectUpdate: ProjectUpdate;

  @RelationId(
    (featuredProject: FeaturedProject) => featuredProject.projectUpdate,
  )
  @Column({ nullable: true })
  projectUpdateId: number;

  @Field(type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  position: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
