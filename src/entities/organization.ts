import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Project } from './project';
import { Token } from './token';
import { ProjectStatusReason } from './projectStatusReason';

@Entity()
@ObjectType()
export class Organization extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  name: string;

  @Field()
  @Column('text', { nullable: true })
  website?: string;

  @Field(type => [Project], { nullable: true })
  @OneToMany(type => Project, project => project.organization)
  projects?: Project[];

  @Field(type => [Token], { nullable: true })
  @ManyToMany(type => Token, {
    nullable: true,
    eager: true,
    cascade: true,
  })
  @JoinTable()
  tokens: Token[];
}
