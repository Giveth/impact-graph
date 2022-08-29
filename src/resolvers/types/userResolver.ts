import { User } from '../../entities/user';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UserByAddressResponse extends User {
  @Field(type => Boolean, { nullable: true })
  isSignedIn?: boolean;
}
