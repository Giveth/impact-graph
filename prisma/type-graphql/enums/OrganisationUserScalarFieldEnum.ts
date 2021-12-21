import * as TypeGraphQL from "type-graphql";

export enum OrganisationUserScalarFieldEnum {
  id = "id",
  role = "role",
  organisationId = "organisationId",
  userId = "userId"
}
TypeGraphQL.registerEnumType(OrganisationUserScalarFieldEnum, {
  name: "OrganisationUserScalarFieldEnum",
  description: undefined,
});
