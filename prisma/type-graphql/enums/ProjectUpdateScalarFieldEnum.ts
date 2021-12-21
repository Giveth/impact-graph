import * as TypeGraphQL from "type-graphql";

export enum ProjectUpdateScalarFieldEnum {
  id = "id",
  title = "title",
  projectId = "projectId",
  userId = "userId",
  content = "content",
  createdAt = "createdAt",
  isMain = "isMain"
}
TypeGraphQL.registerEnumType(ProjectUpdateScalarFieldEnum, {
  name: "ProjectUpdateScalarFieldEnum",
  description: undefined,
});
