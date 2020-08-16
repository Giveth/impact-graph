import { MaxLength, Length } from 'class-validator'
import { InputType, Field } from 'type-graphql'

import { Project } from '../../entities/project'

@InputType()
export class ProjectInput implements Partial<Project> {
  @Field()
  @MaxLength(70)
  title: string

  @Field({ nullable: true })
  @Length(30, 255)
  description?: string

  @Field()
  organisationId?: number

  @Field({ nullable: true })
  categoryId?: number

  @Field({ nullable: true })
  imageUrl?: string

  @Field({ nullable: true })
  coOrdinates?: string
}
