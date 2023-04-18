import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project';
import { User } from './user';

@Entity()
@ObjectType()
@Unique(['roundNumber', 'project'])
export class PreviousRoundRank extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => Project)
  @ManyToOne(type => Project)
  project: Project;

  @RelationId(
    (previousRoundRank: PreviousRoundRank) => previousRoundRank.project,
  )
  @Column()
  projectId: number;

  @Field()
  @Column('number')
  round: number;

  @Field()
  @Column('number')
  rank: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
