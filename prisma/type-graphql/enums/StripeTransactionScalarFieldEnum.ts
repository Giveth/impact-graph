import * as TypeGraphQL from "type-graphql";

export enum StripeTransactionScalarFieldEnum {
  id = "id",
  projectId = "projectId",
  status = "status",
  sessionId = "sessionId",
  donorCustomerId = "donorCustomerId",
  donorName = "donorName",
  donorEmail = "donorEmail",
  createdAt = "createdAt",
  amount = "amount",
  donateToGiveth = "donateToGiveth",
  anonymous = "anonymous",
  currency = "currency"
}
TypeGraphQL.registerEnumType(StripeTransactionScalarFieldEnum, {
  name: "StripeTransactionScalarFieldEnum",
  description: undefined,
});
