import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  UpdateDateColumn,
  CreateDateColumn,
  JoinTable,
  Index,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';

// Copied from projects enums
export enum CampaignSortingField {
  MostFunded = 'MostFunded',
  MostLiked = 'MostLiked',
  Newest = 'Newest',
  Oldest = 'Oldest',
  RecentlyUpdated = 'RecentlyUpdated',
  QualityScore = 'QualityScore',
  GIVPower = 'GIVPower',
}

export enum CampaignFilterField {
  verified = 'verified',
  givingBlocksId = 'givingBlocksId',
  acceptFundOnGnosis = 'acceptFundOnGnosis',
  fromGivingBlock = 'fromGivingBlock',
  boostedWithGivPower = 'boostedWithGivPower',
}

export enum CampaignType {
  ManuallySelected = 'ManuallySelected',
  SortField = 'SortField',
  FilterFields = 'FilterFields',
  WithoutProjects = 'WithoutProjects',
}

@Entity()
@ObjectType()
export class Campaign extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { nullable: false, unique: true })
  slug: string;

  @Field()
  @Column('text', { nullable: false })
  title: string;

  @Field(type => String)
  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  type: CampaignType;

  @Field({ nullable: false })
  @Column({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Column({ default: false })
  isNew: boolean;

  @Field()
  @Column({ default: false })
  isFeatured: boolean;

  @Field()
  @Column('text', { nullable: false })
  description: string;

  @Field(type => [String], { nullable: true })
  @Column('text', { nullable: true, array: true })
  hashtags: string[];

  @Field(type => [String], { nullable: true })
  @Column('text', { nullable: true, array: true })
  relatedProjectsSlugs: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  // ipfs link
  photo?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  // ipfs link
  video?: string;

  @Field(type => [Project], { nullable: true })
  relatedProjects: Project[];

  @Field({ nullable: true })
  relatedProjectsCount?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  order: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  landingLink: string;

  @Field(type => [String], { nullable: true })
  @Column({
    type: 'enum',
    enum: CampaignFilterField,
    nullable: true,
    array: true,
  })
  filterFields: CampaignFilterField[];

  @Field(type => String, { nullable: true })
  @Column({
    type: 'enum',
    enum: CampaignSortingField,
    nullable: true,
  })
  sortingField: CampaignSortingField;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
