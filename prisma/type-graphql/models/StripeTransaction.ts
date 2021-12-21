import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";

@TypeGraphQL.ObjectType("StripeTransaction", {
  isAbstract: true
})
export class StripeTransaction {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  projectId!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  status!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  sessionId?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  donorCustomerId?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  donorName?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  donorEmail?: string | null;

  @TypeGraphQL.Field(_type => Date, {
    nullable: false
  })
  createdAt!: Date;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  amount?: number | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  donateToGiveth?: boolean | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  anonymous!: boolean;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  currency!: string;
}
