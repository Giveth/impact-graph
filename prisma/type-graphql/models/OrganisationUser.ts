import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Organisation } from "../models/Organisation";
import { User } from "../models/User";

@TypeGraphQL.ObjectType("OrganisationUser", {
  isAbstract: true
})
export class OrganisationUser {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  role!: string;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  organisationId?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  userId?: number | null;

  organisation?: Organisation | null;

  user?: User | null;
}
