import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { User } from './user.js';

@Entity()
@ObjectType()
export class AccountVerification extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  platform: string;

  @Index()
  @Field()
  @Column()
  dId: string;

  @Field()
  @Column()
  protocol: string;

  @Field()
  @Column()
  claim?: string;

  @Field()
  @Column()
  attestation?: string;

  @Index()
  @Field(_type => User)
  @ManyToOne(_type => User, { eager: true })
  user: Relation<User>;

  @RelationId(
    (accountVerification: AccountVerification) => accountVerification.user,
  )
  @Column({ nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
