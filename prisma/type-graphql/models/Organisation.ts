import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { OrganisationProjectsProject } from "../models/OrganisationProjectsProject";
import { OrganisationUser } from "../models/OrganisationUser";
import { OrganisationUsersUser } from "../models/OrganisationUsersUser";
import { ProjectOrganisationsOrganisation } from "../models/ProjectOrganisationsOrganisation";

@TypeGraphQL.ObjectType("Organisation", {
  isAbstract: true
})
export class Organisation {
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
  description?: string | null;

  organisation_projects_project?: OrganisationProjectsProject[];

  organisation_user?: OrganisationUser[];

  organisation_users_user?: OrganisationUsersUser[];

  project_organisations_organisation?: ProjectOrganisationsOrganisation[];

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  _count?: number | null;
}
