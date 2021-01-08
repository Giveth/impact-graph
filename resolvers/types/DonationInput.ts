import { MaxLength, Length } from 'class-validator'
import { InputType, Field  } from 'type-graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@InputType()
export class DonationInput {
  
  @Field()
  transactionId: string

  @Field({ nullable: true })
  anonymous: boolean

  
}
