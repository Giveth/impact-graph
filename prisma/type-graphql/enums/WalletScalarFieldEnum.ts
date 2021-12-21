import * as TypeGraphQL from "type-graphql";

export enum WalletScalarFieldEnum {
  id = "id",
  address = "address",
  userId = "userId"
}
TypeGraphQL.registerEnumType(WalletScalarFieldEnum, {
  name: "WalletScalarFieldEnum",
  description: undefined,
});
