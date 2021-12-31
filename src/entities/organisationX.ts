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
export class OrganisationX {
  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(type => [String], { nullable: true })
  projects: string[];
}
