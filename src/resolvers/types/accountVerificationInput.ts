import { InputType, Field } from 'type-graphql';

@InputType()
export class AccountVerificationInput {
  @Field({ nullable: true })
  platform: string;

  @Field({ nullable: true })
  dId?: string;

  @Field({ nullable: true })
  protocol: string;

  @Field({ nullable: true })
  claim?: string;

  // JWT verification from 3box or other source
  @Field({ nullable: true })
  attestation?: string;
}
