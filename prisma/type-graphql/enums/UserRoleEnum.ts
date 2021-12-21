import * as TypeGraphQL from "type-graphql";

export enum UserRoleEnum {
  admin = "admin",
  restricted = "restricted"
}
TypeGraphQL.registerEnumType(UserRoleEnum, {
  name: "UserRoleEnum",
  description: undefined,
});
