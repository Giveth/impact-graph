import { MaxLength, Length } from 'class-validator'
import { InputType, Field  } from 'type-graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@InputType()
export class ProjectInput {
  @Field()
  @MaxLength(70)
  title: string

  @Field({ nullable: true })
  admin?: string

  @Field({ nullable: true })
  @Length(0, 255)
  description?: string

  @Field(type=>[String], { nullable: true, defaultValue: [] })
  categories?: string[]

  // Client uploads image file
  @Field(type => GraphQLUpload, { nullable: true })
  imageUpload?: FileUpload

  // One of static image of website is used as the picture
  @Field({ nullable: true })
  imageStatic?: string

  @Field({ nullable: true })
  impactLocation?: string

  @Field({ nullable: true })
  organisationId?: number

  @Field({ nullable: true })
  coOrdinates?: string

  @Field({ nullable: true })
  fromWalletAddress?: string
}
