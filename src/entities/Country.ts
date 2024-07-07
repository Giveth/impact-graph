import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class Country {
  @Field()
  name: string;

  @Field()
  code: string;
}
