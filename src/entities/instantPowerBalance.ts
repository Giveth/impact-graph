import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
} from 'typeorm';

@Entity()
@ObjectType()
export class InstantPowerBalance extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => ID)
  @Column()
  @Index({ unique: true })
  userId: number;

  @Field({ defaultValue: 0 })
  @Column('float')
  balance: number;

  // the timestamp (of chain block) the balance value is update at
  @Field({ nullable: true })
  @Column()
  balanceAggregatorUpdatedAt: Date;
}
