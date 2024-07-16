import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  RelationId,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Field, ID, ObjectType } from 'type-graphql';
import { Project } from './project.js';

@Entity()
@ObjectType()
@Unique(['round', 'project'])
export class PreviousRoundRank extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Relation<Project>;

  @RelationId(
    (previousRoundRank: PreviousRoundRank) => previousRoundRank.project,
  )
  @Column()
  projectId: number;

  @Field()
  @Column()
  round: number;

  @Field()
  @Column()
  rank: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
