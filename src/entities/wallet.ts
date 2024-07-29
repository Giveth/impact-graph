import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
  Relation,
} from 'typeorm';
import { User } from './user.js';

@ObjectType()
@Entity()
export class Wallet extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column('text', { unique: true })
  address: string;

  @Field(_type => User)
  @ManyToOne(_type => User, { eager: true })
  user: Relation<User>;

  @RelationId((donation: Wallet) => donation.user)
  @Column()
  userId: number;
}
