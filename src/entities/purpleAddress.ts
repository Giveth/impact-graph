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

@Entity()
@ObjectType()
export class PurpleAddress extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Index()
  @Field()
  @Column({ unique: true })
  address: string;

  @Index()
  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project;
  @RelationId((purpleAddress: PurpleAddress) => purpleAddress.project)
  projectId: number;
}
