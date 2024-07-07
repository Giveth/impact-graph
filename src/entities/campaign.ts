import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project';

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
  // https://github.com/Giveth/impact-graph/blob/staging/docs/campaignsInstruction.md

  // In these type of projects we pick some projects to show them in campaign,
  // for instance for Turkey earthquake we pick some projects.
  // so we just need to add slug of those projects in Related Projects Slugs and in
  // what order we add them they will be shown in frontend
  ManuallySelected = 'ManuallySelected',

  //  Sometimes in a campaign we just want to show projects in an specified order,
  //  for instance we can create a campaign like ** Check projects that received most likes** so for
  //  this campaign you set SortField as campaign type and then you can use one of below sorting fields
  SortField = 'SortField',

  // Sometimes we need to filter some projects in a campaign,
  // for instance Let's verified projects that accept funds on Gnosis chain,
  // for this we can Add verified and acceptFundOnGnosis filters
  FilterFields = 'FilterFields',

  //  Some campaigns don't include any project in them and they are just some banner
  //  like Feeling $nice? campaign in below image
  WithoutProjects = 'WithoutProjects',
}

@Entity()
@ObjectType()
export class Campaign extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { nullable: false, unique: true })
  slug: string;

  @Field()
  @Column('text', { nullable: false })
  title: string;

  @Field(_type => String)
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

  @Field(_type => [String], { nullable: true })
  @Column('text', { nullable: true, array: true })
  hashtags: string[];

  @Field(_type => [String], { nullable: true })
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

  @Field({ nullable: true })
  @Column({ nullable: true })
  // ipfs link
  videoPreview?: string;

  @Field(_type => [Project], { nullable: true })
  relatedProjects: Project[];

  @Field({ nullable: true })
  relatedProjectsCount?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  order: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  landingLink: string;

  @Field(_type => [String], { nullable: true })
  @Column({
    type: 'enum',
    enum: CampaignFilterField,
    nullable: true,
    array: true,
  })
  filterFields: CampaignFilterField[];

  @Field(_type => String, { nullable: true })
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
