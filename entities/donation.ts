import { Field, ID, ObjectType } from 'type-graphql'
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  ColumnOptions,
  RelationId
} from 'typeorm'
import { Project } from './project'

@Entity()
@ObjectType()
export class Donation extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  transactionId: string
  
  @Field()
  @Column()
  walletAddress: string

  @Field()
  @Column()
  currency: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  anonymous: boolean

  @Field()
  @Column({type: 'real'})
  amount: number
  
  @Field(type => ID)
  @Column({ nullable: true })
  userId?: number
  
  @Field(type => Project)
  @ManyToOne(type => Project, { eager: true })
  project: Project
  @RelationId((donation: Donation) => donation.project)
  projectId: number
  
  @Field(type => Date)
  @Column()
  createdAt: Date
}
