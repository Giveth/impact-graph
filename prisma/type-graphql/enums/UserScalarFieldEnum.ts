import * as TypeGraphQL from "type-graphql";

export enum UserScalarFieldEnum {
  id = "id",
  role = "role",
  email = "email",
  firstName = "firstName",
  lastName = "lastName",
  name = "name",
  walletAddress = "walletAddress",
  password = "password",
  encryptedPassword = "encryptedPassword",
  avatar = "avatar",
  url = "url",
  location = "location",
  loginType = "loginType",
  dId = "dId",
  confirmed = "confirmed",
  segmentIdentified = "segmentIdentified"
}
TypeGraphQL.registerEnumType(UserScalarFieldEnum, {
  name: "UserScalarFieldEnum",
  description: undefined,
});
