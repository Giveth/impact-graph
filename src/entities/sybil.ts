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
import { QfRound } from './qfRound';

@ObjectType()
@Entity()
export class Sybil extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field({ nullable: false })
  @Column('boolean', { nullable: false, default: false })
  confirmedSybil: boolean;

  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user: User;

  @RelationId((sybil: Sybil) => sybil.user)
  @Column()
  userId: number;

  @Field(type => QfRound)
  @ManyToOne(type => QfRound, { eager: true })
  qfRound: QfRound;

  @RelationId((sybil: Sybil) => sybil.qfRound)
  @Column()
  qfRoundId: number;
}
