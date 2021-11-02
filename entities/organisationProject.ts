import { Field, ID, ObjectType } from 'type-graphql';
import { PrimaryGeneratedColumn, Column, Entity, ManyToOne } from 'typeorm';
import { Organisation } from './organisation';
import { Project } from './project';
import { RelationColumn } from '../helpers';

// @ObjectType()
// @Entity()
// export class OrganisationProject {
//   @Field(type => ID)
//   @PrimaryGeneratedColumn()
//   readonly id: number

//   @Field(type => Organisation)
//   @ManyToOne(type => Organisation)
//   organisation: Organisation

//   @RelationColumn()
//   organisationId?: number

//   // @Field(type => Project)
//   // @ManyToOne(type => Project)
//   // project: Project
//   @RelationColumn()
//   projectId?: number
// }
