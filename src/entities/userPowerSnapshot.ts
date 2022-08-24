import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Field, ID } from 'type-graphql';
import { User } from './user';

@Object()
@Entity()
export class UserPowerSnapshot extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Field(type => User)
  @ManyToOne(type => User, { eager: true })
  user: User;
  @RelationId((userPowerSnapshot: UserPowerSnapshot) => userPowerSnapshot.user)
  userId: number;

  @Column()
  @Field()
  date: Date;

  @Column()
  @Field()
  power: number;
}
