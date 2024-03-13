import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
} from 'typeorm';
import { User } from './user';

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
  user: User;
  @RelationId((donation: Wallet) => donation.user)
  @Column()
  userId: number;
}
