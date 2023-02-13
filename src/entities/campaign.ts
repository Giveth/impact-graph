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
  QualityScore = 'QualityScore',
  GIVPower = 'GIVPower',
}

export enum CampaignFilterField {
  Verified = 'Verified',
  AcceptGiv = 'AcceptGiv',
  AcceptFundOnGnosis = 'AcceptFundOnGnosis',
  GivingBlock = 'GivingBlock',
  BoostedWithGivPower = 'BoostedWithGivPower',
}

export enum CampaignType {
  RelatedProjects = 'RelatedProjects',
  SortField = 'SortField',
  FilterFields = 'FilterFields',
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
  media: string;

  @ManyToMany(type => Project, project => project.campaigns, {
    nullable: true,
  })
  @Field(type => [Project])
  // @Field(type => [Project], { nullable: true })
  @JoinTable()
  relatedProjects: Project[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field()
  @Column({ default: false })
  isFeatured: boolean;

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

  @Field(type => String)
  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  type: CampaignType;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
