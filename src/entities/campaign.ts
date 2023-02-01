import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  ManyToOne,
  RelationId,
  OneToMany,
} from 'typeorm';
import { Project } from './project';

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

  @Field({ nullable: true })
  @Column({ nullable: true })
  hashtags: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  // ipfs link
  media: string;

  @ManyToMany(type => Project, project => project.campaigns)
  relatedProjects: Project[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  order: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  landingLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  usedHomepageFilter: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  usedHomepageSorting: string;
}
