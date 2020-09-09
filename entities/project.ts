import { Field, ID, Float, ObjectType, Authorized } from 'type-graphql'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  ColumnOptions,
  JoinTable
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
export class Project {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column()
  title: string

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
  categoryId?: number

  @Field({ nullable: true })
  @Column({ nullable: true })
  coOrdinates?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  imageUrl?: string

  @Field(type=> Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0
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
