import { Field, ID, Float, ObjectType, Authorized } from 'type-graphql'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ColumnOptions,
  JoinTable, 
  BaseEntity,
  Index
} from 'typeorm'

import { Organisation } from './organisation'

// import { OrganisationProject } from './organisationProject'
// NO idea why the below import doesn't work!!!
// import { RelationColumn } from "../helpers";
function RelationColumn (options?: ColumnOptions) {
  return Column({ nullable: true, ...options })
}

@Entity()
@ObjectType()
class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  @Field()
  name: string;

  @ManyToMany(type => Project, project => project.categories)
  projects: Project[];
}

@Entity()
@ObjectType()
class Project extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  admin?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  organisationId?: number

  @Field({ nullable: true })
  @Column({ nullable: true })
  creationDate: Date

  @Field(type => [Organisation])
  @ManyToMany(type => Organisation)
  @JoinTable()
  organisations: Organisation[]

  @Field({ nullable: true })
  @Column({ nullable: true })
  coOrdinates?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  image?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  impactLocation?: string

  @Field(type => [Category], { nullable: true })
  @ManyToMany(type => Category,category => category.projects, { nullable: true, eager: true, cascade: true })
  @JoinTable()
  categories: Category[];

  @Field(type=> Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0
  
  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  walletAddress?: string
  // @Field(type => [OrganisationProject], { nullable: true })
  // @OneToMany(
  //   type => OrganisationProject,
  //   organisationProject => organisationProject.organisation
  // )
  // organisationProjects?: OrganisationProject[]
  // @JoinTable({
  //   name: 'organisation_project',
  //   joinColumn: {
  //     name: 'id',
  //     referencedColumnName: 'organisation_project_id'
  //   }
  // })

  // TODO: add the user back in, after model is clean
  // @Field(type => User)
  // @ManyToOne(type => User)
  // author: User

  // @RelationColumn()
  // authorId: number
}

@Entity()
@ObjectType()
class ProjectUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field(type => String)
  @Column()
  title: string

  @Field(type => ID)
  @Column()
  projectId: number

  @Field(type => ID)
  @Column()
  userId: number

  @Field(type => String)
  @Column()
  content: string

  @Field(type => Date)
  @Column()
  createdAt: Date

  @Field(type => Boolean)
  @Column({ nullable: true })
  isMain: boolean
}

@Entity()
@ObjectType()
class ProjectDonation extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field(type => ID)
  @Column()
  projectId: number

  @Field()
  @Column()
  amount: number

  @Field(type => ID)
  @Column({ nullable: true })
  userId?: number

  @Field(type => String)
  @Column()
  txId: string

  @Field(type => Date)
  @Column()
  createdAt: Date
}

@Entity()
@ObjectType()
class ProjectUpdateReactions extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field(type => ID)
  @Column()
  projectUpdateId: number

  @Field(type => ID)
  @Column()
  userId: number

  @Field(type => String)
  @Column()
  reaction: string
}

export type PROJECT_UPDATE_REACTIONS = "heart";

export {
  Project,
  Category,
  ProjectUpdate,
  ProjectUpdateReactions,
  ProjectDonation
}