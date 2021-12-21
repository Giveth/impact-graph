import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Project } from "../models/Project";
import { User } from "../models/User";

@TypeGraphQL.ObjectType("Donation", {
  isAbstract: true
})
export class Donation {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionId!: string;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  nonce?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  transactionNetworkId!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  status!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  verifyErrorMessage?: string | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  speedup!: boolean;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  isFiat!: boolean;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toWalletAddress!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromWalletAddress!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  currency!: string;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  anonymous?: boolean | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: false
  })
  amount!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  valueEth?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  valueUsd?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  priceEth?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  priceUsd?: number | null;

  @TypeGraphQL.Field(_type => Date, {
    nullable: false
  })
  createdAt!: Date;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  donationType?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  transakStatus?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  transakTransactionLink?: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  projectId?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  userId?: number | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  tokenAddress?: string | null;

  project?: Project | null;

  user?: User | null;
}
