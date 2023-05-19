import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  ManyToOne,
  RelationId,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project';
import { MainCategory } from './mainCategory';

@Entity()
@ObjectType()
export class QfRound extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { nullable: true })
  name: string;

  @ManyToMany(type => Project, project => project.qfRounds)
  projects: Project[];

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Column()
  allocatedFund: number;

  @Field(type => Date)
  @Column()
  beginDate: Date;

  @Field(type => Date)
  @Column()
  endDate: Date;

  @UpdateDateColumn()
  @Column({ nullable: true })
  updatedAt: Date;

  @CreateDateColumn()
  @Column({ nullable: true })
  createdAt: Date;
}
