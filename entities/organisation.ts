import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  JoinTable,
  ColumnOptions,
} from 'typeorm';

import { OrganisationUser } from './organisationUser';
// import { OrganisationProject } from './organisationProject'
import { User } from './user';
import { Project } from './project';
// import { RelationColumn } from '../helpers'
function RelationColumn(options?: ColumnOptions) {
  return Column({ nullable: true, ...options });
}

@Entity()
@ObjectType()
export class Organisation {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  // Manually get the join table
  // @Field(type => [OrganisationProject], { nullable: true })
  // @OneToMany(
  //   type => OrganisationProject,
  //   organisationProject => organisationProject.organisation
  // )
  // organisationProjects?: OrganisationProject[]

  // @RelationColumn()
  // projectOrganisationsOrganisationId: number

  // @Field(type => [Project])
  // projects?: Project[]

  @ManyToMany(type => Project)
  @JoinTable()
  @Field(type => [Project], { nullable: true })
  projects: Project[];

  // @Column()
  // @Field(type => [Project])
  // projectz: Project[]

  @Field(type => User)
  @ManyToMany(type => User, user => user.organisations)
  @JoinTable()
  users: User[];
  // @RelationColumn()
  // authorId: number
}
