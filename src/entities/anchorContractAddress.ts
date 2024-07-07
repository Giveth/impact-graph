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
  project: Project;

  @RelationId((relatedAddress: AnchorContractAddress) => relatedAddress.project)
  @Column({ nullable: true })
  projectId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  creator: User;

  @RelationId(
    (anchorContractAddress: AnchorContractAddress) =>
      anchorContractAddress.creator,
  )
  @Column({ nullable: true })
  creatorId: number;

  @Index()
  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  owner: User;

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
