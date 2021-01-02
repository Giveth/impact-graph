import { Field, ID, ObjectType } from 'type-graphql'
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany
} from 'typeorm'
import { Project } from './project'

@Entity()
@ObjectType()
export class Category extends BaseEntity{
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true })
  name: string

  @Field()
  @Column()
  value: string

  @ManyToMany(type => Project, project => project.categories)
  projects: Project[];
}
