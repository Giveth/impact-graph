import * as TypeGraphQL from "type-graphql";

export enum DonationScalarFieldEnum {
  id = "id",
  transactionId = "transactionId",
  nonce = "nonce",
  transactionNetworkId = "transactionNetworkId",
  status = "status",
  verifyErrorMessage = "verifyErrorMessage",
  speedup = "speedup",
  isFiat = "isFiat",
  toWalletAddress = "toWalletAddress",
  fromWalletAddress = "fromWalletAddress",
  currency = "currency",
  anonymous = "anonymous",
  amount = "amount",
  valueEth = "valueEth",
  valueUsd = "valueUsd",
  priceEth = "priceEth",
  priceUsd = "priceUsd",
  createdAt = "createdAt",
  donationType = "donationType",
  transakStatus = "transakStatus",
  transakTransactionLink = "transakTransactionLink",
  projectId = "projectId",
  userId = "userId",
  tokenAddress = "tokenAddress"
}
TypeGraphQL.registerEnumType(DonationScalarFieldEnum, {
  name: "DonationScalarFieldEnum",
  description: undefined,
});
