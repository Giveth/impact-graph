import { Field, ID, ObjectType, Int } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { Project, ProjectUpdate } from './project.js';

@Entity()
@ObjectType()
export class FeaturedUpdate extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(_type => Project)
  @OneToOne(_type => Project)
  @JoinColumn()
  project: Project;

  @RelationId((featuredUpdate: FeaturedUpdate) => featuredUpdate.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => ProjectUpdate)
  @OneToOne(_type => ProjectUpdate)
  @JoinColumn()
  projectUpdate: ProjectUpdate;

  @RelationId((featuredUpdate: FeaturedUpdate) => featuredUpdate.projectUpdate)
  @Column({ nullable: true })
  projectUpdateId: number;

  @Field(_type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  position: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
