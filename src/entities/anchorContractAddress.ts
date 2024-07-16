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
import { User } from './user.js';

@Entity()
@ObjectType()
@Unique(['address', 'networkId', 'project'])
export class AnchorContractAddress extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column('boolean', { default: false })
  isActive: boolean;

  @Field()
  @Column()
  networkId: number;

  @Index()
  @Field()
  @Column()
  address: string;

  @Index()
  @Field()
  @Column()
  txHash: string;

  @Index()
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project: Relation<Project>;

  @RelationId((relatedAddress: AnchorContractAddress) => relatedAddress.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  creator: Relation<User>;

  @RelationId(
    (anchorContractAddress: AnchorContractAddress) =>
      anchorContractAddress.creator,
  )
  @Column({ nullable: true })
  creatorId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  owner: Relation<User>;

  @RelationId(
    (anchorContractAddress: AnchorContractAddress) =>
      anchorContractAddress.owner,
  )
  @Column({ nullable: true })
  ownerId: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
