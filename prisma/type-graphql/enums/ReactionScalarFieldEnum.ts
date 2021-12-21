import * as TypeGraphQL from "type-graphql";

export enum ReactionScalarFieldEnum {
  id = "id",
  projectUpdateId = "projectUpdateId",
  userId = "userId",
  reaction = "reaction",
  projectId = "projectId"
}
TypeGraphQL.registerEnumType(ReactionScalarFieldEnum, {
  name: "ReactionScalarFieldEnum",
  description: undefined,
});
