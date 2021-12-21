import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Organisation } from "../models/Organisation";
import { Project } from "../models/Project";

@TypeGraphQL.ObjectType("OrganisationProjectsProject", {
  isAbstract: true
})
export class OrganisationProjectsProject {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  organisationId!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  projectId!: number;

  organisation?: Organisation;

  project?: Project;
}
