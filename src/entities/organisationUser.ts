import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  ColumnOptions,
} from 'typeorm';
import { Organisation } from './organisation';
import { User } from './user';
// import { RelationColumn } from '../helpers'
function RelationColumn(options?: ColumnOptions) {
  return Column({ nullable: true, ...options });
}
@ObjectType()
@Entity()
export class OrganisationUser {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  role: string;

  @Field(type => Organisation)
  @ManyToOne(type => Organisation)
  organisation: Organisation;
  @RelationColumn()
  organisationId: number;

  @Field(type => User)
  @ManyToOne(type => User)
  user: User;
}
