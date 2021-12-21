import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { ProjectCategoriesCategory } from "../models/ProjectCategoriesCategory";

@TypeGraphQL.ObjectType("Category", {
  isAbstract: true
})
export class Category {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  name?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  value?: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  source?: string | null;

  project_categories_category?: ProjectCategoriesCategory[];

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  _count?: number | null;
}
