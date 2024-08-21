import { Field, ObjectType } from 'type-graphql';
import { User } from '../../entities/user';

@ObjectType()
export class UserByAddressResponse extends User {
  @Field(_type => Boolean, { nullable: true })
  isSignedIn?: boolean;
  @Field(_type => Boolean, { nullable: true })
  isEmailSent?: boolean;
  @Field(_type => Boolean, { nullable: true })
  useHasProject?: boolean;
}
