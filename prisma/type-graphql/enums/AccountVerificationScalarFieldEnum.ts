import * as TypeGraphQL from "type-graphql";

export enum AccountVerificationScalarFieldEnum {
  id = "id",
  platform = "platform",
  dId = "dId",
  protocol = "protocol",
  claim = "claim",
  attestation = "attestation",
  createdAt = "createdAt",
  updatedAt = "updatedAt",
  userId = "userId"
}
TypeGraphQL.registerEnumType(AccountVerificationScalarFieldEnum, {
  name: "AccountVerificationScalarFieldEnum",
  description: undefined,
});
