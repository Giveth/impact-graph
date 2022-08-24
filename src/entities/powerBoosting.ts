import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';
import { IsInt, Max, Min } from 'class-validator';

@Entity()
@ObjectType()
export class PowerBoosting extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.project)
  projectId: number;

  @Index()
  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user: User;
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.user)
  userId: number;

  @Field()
  @Column()
  // https://orkhan.gitbook.io/typeorm/docs/validation
  @IsInt()
  @Min(0)
  @Max(100)
  percentage: number;
}
