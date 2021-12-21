import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";

@TypeGraphQL.ObjectType("BankAccount", {
  isAbstract: true
})
export class BankAccount {
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
  productId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  bankName!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  accountHolderName!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  accountHolderType!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  country!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  currency!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  accountId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fingerprint!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  last4!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  routingNumber!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  status!: string;
}
