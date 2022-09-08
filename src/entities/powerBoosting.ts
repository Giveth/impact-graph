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
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';
import { Max, Min, IsNumber } from 'class-validator';

class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

@Entity()
@ObjectType()
@Index(['projectId', 'userId'], { unique: true })
export class PowerBoosting extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;

  @Index()
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.project)
  @Column({ nullable: false })
  projectId: number;

  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user: User;

  @Index()
  @RelationId((powerBoosting: PowerBoosting) => powerBoosting.user)
  @Column({ nullable: false })
  userId: number;

  @Field()
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
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
