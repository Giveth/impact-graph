import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { AccountVerification } from "../models/AccountVerification";
import { Donation } from "../models/Donation";
import { OrganisationUser } from "../models/OrganisationUser";
import { OrganisationUsersUser } from "../models/OrganisationUsersUser";
import { ProjectUsersUser } from "../models/ProjectUsersUser";
import { UserProjectsProject } from "../models/UserProjectsProject";
import { Wallet } from "../models/Wallet";
import { UserRoleEnum } from "../enums/UserRoleEnum";

@TypeGraphQL.ObjectType("User", {
  isAbstract: true
})
export class User {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => UserRoleEnum, {
    nullable: false
  })
  role!: "admin" | "restricted";

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  email?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  firstName?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  lastName?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  name?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  walletAddress!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  password?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  encryptedPassword?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  avatar?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  url?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  location?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  loginType!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  dId?: string | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  confirmed!: boolean;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  segmentIdentified!: boolean;

  account_verification?: AccountVerification[];

  donation?: Donation[];

  organisation_user?: OrganisationUser[];

  organisation_users_user?: OrganisationUsersUser[];

  project_users_user?: ProjectUsersUser[];

  user_projects_project?: UserProjectsProject[];

  wallet?: Wallet[];

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  _count?: number | null;
}
