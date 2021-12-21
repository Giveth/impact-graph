import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { User } from "../models/User";

@TypeGraphQL.ObjectType("AccountVerification", {
  isAbstract: true
})
export class AccountVerification {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  platform!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  dId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  protocol!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  claim!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  attestation!: string;

  @TypeGraphQL.Field(_type => Date, {
    nullable: false
  })
  createdAt!: Date;

  @TypeGraphQL.Field(_type => Date, {
    nullable: false
  })
  updatedAt!: Date;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  userId?: number | null;

  user?: User | null;
}
