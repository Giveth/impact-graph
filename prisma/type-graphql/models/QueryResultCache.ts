import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";

@TypeGraphQL.ObjectType("QueryResultCache", {
  isAbstract: true
})
export class QueryResultCache {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  identifier?: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  time!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  duration!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  query!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  result!: string;
}
