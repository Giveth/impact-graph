import { Field, ID, ObjectType } from 'type-graphql'
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany
} from 'typeorm'
import { Project } from './project'

@Entity()
@ObjectType()
export class ProjectStatus extends BaseEntity{
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true })
  symbol: string

  @Field()
  @Column({ nullable: true })
  name: string

  @Field()
  @Column({ nullable: true })
  description: string

  @Field(type => [Project], { nullable: true })
  @OneToMany(
    type => Project,
    project => project.status
  )
  projects?: Project[]

}
