import { Field, ID, Int, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
} from 'typeorm';

@Entity()
@ObjectType()
export class PowerSnapshot extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(type => Date)
  @Column()
  @Index({ unique: true })
  time: Date;

  @Field(type => Int)
  @Column('integer', { nullable: true })
  @Index({ unique: true })
  blockNumber?: number;

  @Field()
  @Column({ type: 'integer', nullable: true })
  roundNumber: number;
}
