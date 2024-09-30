import { Field, Float, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';

@Entity()
@ObjectType()
@Index(['projectId', 'userId'], {
  unique: true,
})
export class ProjectUserRecord extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => Float)
  @Column({ type: 'float', default: 0 })
  totalDonationAmount: number;

  // Early access total donation amount
  @Field(_type => Float)
  @Column({ type: 'float', default: 0 })
  eaTotalDonationAmount: number;

  // QF rounds total donation amount
  @Field(_type => Float)
  @Column({ type: 'float', default: 0 })
  qfTotalDonationAmount: number;

  @Field(_type => Project)
  @ManyToOne(_type => Project, { eager: false })
  project: Project;

  @Column({ nullable: false })
  @RelationId((ps: ProjectUserRecord) => ps.project)
  projectId: number;

  @Field(_type => User)
  @ManyToOne(_type => User, { eager: true })
  user: User;

  @Column({ nullable: false })
  @RelationId((ps: ProjectUserRecord) => ps.user)
  userId: number;
}
