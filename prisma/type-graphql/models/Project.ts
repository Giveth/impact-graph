import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Donation } from "../models/Donation";
import { OrganisationProjectsProject } from "../models/OrganisationProjectsProject";
import { ProjectCategoriesCategory } from "../models/ProjectCategoriesCategory";
import { ProjectImage } from "../models/ProjectImage";
import { ProjectOrganisationsOrganisation } from "../models/ProjectOrganisationsOrganisation";
import { ProjectStatus } from "../models/ProjectStatus";
import { ProjectUsersUser } from "../models/ProjectUsersUser";
import { Reaction } from "../models/Reaction";
import { UserProjectsProject } from "../models/UserProjectsProject";

@TypeGraphQL.ObjectType("Project", {
  isAbstract: true
})
export class Project {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  title!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  slug?: string | null;

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  slugHistory!: string[];

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  admin?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  description?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  traceCampaignId?: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  organisationId?: number | null;

  @TypeGraphQL.Field(_type => Date, {
    nullable: true
  })
  creationDate?: Date | null;

  @TypeGraphQL.Field(_type => Date, {
    nullable: true
  })
  updatedAt?: Date | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  coOrdinates?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  image?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  impactLocation?: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: true
  })
  balance?: number | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  stripeAccountId?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  walletAddress!: string;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  verified!: boolean;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  giveBacks!: boolean;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  qualityScore?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Float, {
    nullable: false
  })
  totalDonations!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  totalReactions?: number | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  totalProjectUpdates?: number | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  listed?: boolean | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  statusId?: number | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  givingBlocksId?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  website?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  youtube?: string | null;

  project_status?: ProjectStatus | null;

  donation?: Donation[];

  organisation_projects_project?: OrganisationProjectsProject[];

  project_categories_category?: ProjectCategoriesCategory[];

  project_image?: ProjectImage[];

  project_organisations_organisation?: ProjectOrganisationsOrganisation[];

  project_users_user?: ProjectUsersUser[];

  reaction?: Reaction[];

  user_projects_project?: UserProjectsProject[];

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  _count?: number | null;
}
