import { Field, ObjectType } from 'type-graphql';
import {
  Column,
  Index,
  PrimaryGeneratedColumn,
  BaseEntity,
  Entity,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project';

@Entity('estimated_cluster_matching')
@Index('estimated_cluster_matching_project_id_qfround_id', [
  'projectId',
  'qfRoundId',
])
@Index('estimated_cluster_matching_matching', ['matching'])
@ObjectType()
export class EstimatedClusterMatching extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number; // New primary key

  @Field(_type => Project)
  @ManyToOne(_type => Project, project => project.projectEstimatedMatchingView)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @Field()
  @Column()
  projectId: number;

  @Field()
  @Column()
  qfRoundId: number;

  @Field()
  @Column('double precision')
  matching: number;
}
