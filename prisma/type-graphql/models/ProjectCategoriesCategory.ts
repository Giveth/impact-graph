import * as TypeGraphQL from "type-graphql";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../scalars";
import { Category } from "../models/Category";
import { Project } from "../models/Project";

@TypeGraphQL.ObjectType("ProjectCategoriesCategory", {
  isAbstract: true
})
export class ProjectCategoriesCategory {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  projectId!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  categoryId!: number;

  category?: Category;

  project?: Project;
}
