import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  RelationId,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user';
import { QfRound } from './qfRound';

@ObjectType()
@Entity()
export class UserPassportScore extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field({ nullable: false })
  @Column()
  passportScore: number;

  @Field({ nullable: false })
  @Column()
  passportStamps: number;

  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user: User;

  @RelationId((userPassportScore: UserPassportScore) => userPassportScore.user)
  @Column()
  userId: number;

  @Field(type => QfRound)
  @ManyToOne(type => QfRound, { eager: true })
  qfRound: QfRound;

  @RelationId(
    (userPassportScore: UserPassportScore) => userPassportScore.qfRound,
  )
  @Column()
  qfRoundId: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
