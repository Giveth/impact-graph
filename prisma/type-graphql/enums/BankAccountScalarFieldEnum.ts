import * as TypeGraphQL from "type-graphql";

export enum BankAccountScalarFieldEnum {
  id = "id",
  projectId = "projectId",
  productId = "productId",
  bankName = "bankName",
  accountHolderName = "accountHolderName",
  accountHolderType = "accountHolderType",
  country = "country",
  currency = "currency",
  accountId = "accountId",
  fingerprint = "fingerprint",
  last4 = "last4",
  routingNumber = "routingNumber",
  status = "status"
}
TypeGraphQL.registerEnumType(BankAccountScalarFieldEnum, {
  name: "BankAccountScalarFieldEnum",
  description: undefined,
});
