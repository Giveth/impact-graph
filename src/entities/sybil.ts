import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
  Unique,
} from 'typeorm';
import { User } from './user.js';
import { QfRound } from './qfRound.js';

@ObjectType()
@Entity()
@Unique(['userId', 'qfRoundId'])
export class Sybil extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field(_type => User)
  @ManyToOne(_type => User, { eager: true })
  user: User;

  @RelationId((sybil: Sybil) => sybil.user)
  @Column()
  userId: number;

  @Field(_type => QfRound)
  @ManyToOne(_type => QfRound, { eager: true })
  qfRound: QfRound;

  @RelationId((sybil: Sybil) => sybil.qfRound)
  @Column()
  qfRoundId: number;

  @Column()
  walletAddress: string;
}
