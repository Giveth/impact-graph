import { Field, Float, ObjectType } from 'type-graphql';

@ObjectType()
export class EstimatedMatching {
  @Field(type => Float, { nullable: true })
  projectDonationsSqrtRootSum?: number;

  @Field(type => Float, { nullable: true })
  allProjectsSum?: number;

  @Field(type => Float, { nullable: true })
  matchingPool?: number;
}
