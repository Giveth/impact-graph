import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  Index,
} from 'typeorm';
import { Organization } from './organization';
import { ChainType } from '../types/network';

@Entity()
@ObjectType()
@Index(['address', 'networkId'], { unique: true })
export class Token extends BaseEntity {
  @Field(_type => ID)
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

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  // Some tokens like PAN, XNODE, CRV dont have price on coingecko for gnosis network, So frontend guys suggested
  // add  mainnetAddress field for those tokens, then client can get price of these tokens in mainnet
  mainnetAddress: string;

  @Field()
  @Column()
  networkId: number;

  @Field(_type => String)
  @Column({
    type: 'enum',
    enum: ChainType,
    default: ChainType.EVM,
  })
  chainType: ChainType;

  @Field()
  @Column()
  decimals: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  // 1 is the order with most priority, and null means it doesn't have any priority
  order?: number;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: false, default: false })
  isGivbackEligible: boolean;

  @Field(_type => Boolean, { nullable: true })
  @Column({ nullable: true, default: false })
  isStableCoin: boolean;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  // If we fill that, we will get price of this token from coingecko
  coingeckoId: string;

  @Field(_type => String, { nullable: true })
  @Column({ nullable: true })
  // If we fill that, we will get price of this token from cryptocompare
  cryptoCompareId: string;

  @ManyToMany(_type => Organization, organization => organization.tokens, {
    // make it true to show organizations in token page of adminjs panel
    eager: true,
  })
  organizations: Organization[];
}
