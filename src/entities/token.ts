import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';

@Entity()
@ObjectType()
export class Token extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  name: string;

  @Field()
  @Column('text')
  symbol: string;

  @Field()
  @Column('text')
  address: string;

  @Field()
  @Column()
  networkId: number;

  @Field()
  @Column()
  decimals: number;
  //
  // @Field(type => [Organization])
  // @ManyToMany(type => Organization)
  // @JoinTable()
  // organizations: Organization[];
}
