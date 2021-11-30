import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
export default class Notification {
  @Field(type => ID)
  id: number;

  @Field({ nullable: true })
  message?: string;

  @Field(type => Date)
  date: Date;
}
