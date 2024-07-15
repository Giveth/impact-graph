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
import { Project } from './project.js';
import { User } from './user.js';
import { ChainType } from '../types/network.js';

@Entity()
@ObjectType()
@Unique(['address', 'networkId', 'project'])
export class ProjectAddress extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Index()
  @Field({ nullable: true })
  @Column({ nullable: true })
  title?: string;

  @Field()
  @Column()
  networkId: number;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ChainType,
    default: ChainType.EVM,
  })
  chainType: ChainType;

  @Index()
  @Field()
  @Column()
  address: string;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Project;

  @RelationId((relatedAddress: ProjectAddress) => relatedAddress.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  user: User;

  @RelationId((relatedAddress: ProjectAddress) => relatedAddress.user)
  @Column({ nullable: true })
  userId: number;

  @Field()
  @Column('boolean', { default: false })
  isRecipient: boolean;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
