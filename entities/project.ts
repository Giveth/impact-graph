import { Field, ID, Float, ObjectType, Authorized } from 'type-graphql'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ColumnOptions,
  JoinTable, 
  BaseEntity,
  OneToMany
} from 'typeorm'

import { Organisation } from './organisation'
import { Donation } from './donation'
import { Reaction } from './reaction'
import { Category } from './category'

// import { OrganisationProject } from './organisationProject'
// NO idea why the below import doesn't work!!!
// import { RelationColumn } from "../helpers";
function RelationColumn (options?: ColumnOptions) {
  return Column({ nullable: true, ...options })
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
  
  @Field(type => [Donation], { nullable: true })
  @OneToMany(
    type => Donation,
    donation => donation.project
  )
  donations?: Donation[]

  @Field(type => [Reaction], { nullable: true })
  @OneToMany(
    type => Reaction,
    reaction => reaction.project
  )
  reactions?: Reaction[]
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

export {
  Project,
  Category,
  ProjectUpdate
}