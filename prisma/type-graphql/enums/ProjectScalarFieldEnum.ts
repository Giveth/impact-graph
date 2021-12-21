import * as TypeGraphQL from "type-graphql";

export enum ProjectScalarFieldEnum {
  id = "id",
  title = "title",
  slug = "slug",
  slugHistory = "slugHistory",
  admin = "admin",
  description = "description",
  traceCampaignId = "traceCampaignId",
  organisationId = "organisationId",
  creationDate = "creationDate",
  updatedAt = "updatedAt",
  coOrdinates = "coOrdinates",
  image = "image",
  impactLocation = "impactLocation",
  balance = "balance",
  stripeAccountId = "stripeAccountId",
  walletAddress = "walletAddress",
  verified = "verified",
  giveBacks = "giveBacks",
  qualityScore = "qualityScore",
  totalDonations = "totalDonations",
  totalReactions = "totalReactions",
  totalProjectUpdates = "totalProjectUpdates",
  listed = "listed",
  statusId = "statusId",
  givingBlocksId = "givingBlocksId",
  website = "website",
  youtube = "youtube"
}
TypeGraphQL.registerEnumType(ProjectScalarFieldEnum, {
  name: "ProjectScalarFieldEnum",
  description: undefined,
});
