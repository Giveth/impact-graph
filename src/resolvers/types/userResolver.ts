import { Field, ObjectType } from 'type-graphql';
import { User } from '../../entities/user.js';

@ObjectType()
export class UserByAddressResponse extends User {
  @Field(_type => Boolean, { nullable: true })
  isSignedIn?: boolean;
}
