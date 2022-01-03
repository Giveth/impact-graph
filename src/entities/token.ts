import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Token {
  @Field({ nullable: true })
  chainId: number;

  @Field({ nullable: true })
  address: string;

  @Field({ nullable: true })
  symbol: string;

  @Field({ nullable: true })
  name: string;

  @Field({ nullable: true })
  decimals: number;
}
