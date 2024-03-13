import { User } from '../../entities/user';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class UserByAddressResponse extends User {
  @Field(_type => Boolean, { nullable: true })
  isSignedIn?: boolean;
}
