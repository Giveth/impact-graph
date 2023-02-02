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
enum SortingField {
  MostFunded = 'MostFunded',
  MostLiked = 'MostLiked',
  Newest = 'Newest',
  Oldest = 'Oldest',
  QualityScore = 'QualityScore',
  GIVPower = 'GIVPower',
}

enum FilterField {
  Verified = 'verified',
  AcceptGiv = 'givingBlocksId',
  AcceptFundOnGnosis = 'acceptFundOnGnosis',
  GivingBlock = 'fromGivingBlock',
  BoostedWithGivPower = 'boostedWithGivPower',
}

@Entity()
@ObjectType()
export class Campaign extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true, nullable: false })
  name: string;

  @Field()
  @Column('text', { unique: true, nullable: false })
  title: string;

  @Field()
  @Column('text', { unique: true, nullable: false })
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
  @Field(type => [Project], { nullable: true })
  @JoinTable()
  relatedProjects?: Project[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  order: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  landingLink: string;

  @Column({
    type: 'enum',
    enum: FilterField,
    nullable: true,
    array: true,
  })
  filterFields: FilterField[];

  @Column({
    type: 'enum',
    enum: SortingField,
    nullable: true,
  })
  sortingField: SortingField;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
