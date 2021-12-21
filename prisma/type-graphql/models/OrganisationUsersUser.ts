import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Organisation } from "../models/Organisation";
import { User } from "../models/User";

@TypeGraphQL.ObjectType("OrganisationUsersUser", {
  isAbstract: true
})
export class OrganisationUsersUser {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  organisationId!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  userId!: number;

  organisation?: Organisation;

  user?: User;
}
