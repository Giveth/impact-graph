import { Field, ID, ObjectType } from 'type-graphql';
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
import { Int } from 'type-graphql/dist/scalars/aliases';
import { Project, ProjectUpdate } from './project';

@Entity()
@ObjectType()
export class FeaturedUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field(type => Project)
  @OneToOne(type => Project)
  @JoinColumn()
  project: Project;

  @RelationId((featuredUpdate: FeaturedUpdate) => featuredUpdate.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(type => ProjectUpdate)
  @OneToOne(type => ProjectUpdate)
  @JoinColumn()
  projectUpdate: ProjectUpdate;

  @RelationId((featuredUpdate: FeaturedUpdate) => featuredUpdate.projectUpdate)
  @Column({ nullable: true })
  projectUpdateId: number;

  @Field(type => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  position: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
