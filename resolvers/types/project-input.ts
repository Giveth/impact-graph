import { MaxLength, Length } from "class-validator";
import { InputType, Field } from "type-graphql";

import { Project } from "../../entities/project";

@InputType()
export class ProjectInput implements Partial<Project> {
  @Field()
  @MaxLength(30)
  title: string;

  @Field({ nullable: true })
  @Length(30, 255)
  description?: string;
}
