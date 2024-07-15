import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { Max, Min, IsNumber } from 'class-validator';
import { Project } from './project.js';
import { User } from './user.js';
import { ColumnNumericTransformer } from '../utils/entities.js';

@Entity()
@ObjectType()
@Index(['projectId', 'userId'], { unique: true })
export class PowerBoosting extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: true })
  project: Project;

  @Index()
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.project)
  @Column({ nullable: false })
  projectId: number;

  @Field(_type => User)
  @ManyToOne(_type => User, { eager: true })
  user: User;

  @Index()
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.user)
  @Column({ nullable: false })
  userId: number;

  @Field(_type => Float)
  @Column('numeric', {
    precision: 5, // 100.00
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  // https://orkhan.gitbook.io/typeorm/docs/validation
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @CreateDateColumn()
  @Field()
  createdAt: Date;

  @UpdateDateColumn()
  @Field()
  updatedAt: Date;
}
