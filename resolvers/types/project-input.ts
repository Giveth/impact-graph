import { MaxLength, Length } from 'class-validator'
import { InputType, Field  } from 'type-graphql'

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

  @Field({ nullable: true })
  image?: string

  @Field({ nullable: true })
  impactLocation?: string

  @Field({ nullable: true })
  organisationId?: number

  @Field({ nullable: true })
  coOrdinates?: string
}
