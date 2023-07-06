import { Field, Float, ObjectType } from 'type-graphql';

@ObjectType()
export class EstimatedMatching {
  @Field(type => Float)
  projectDonationsSqrtRootSum: number;

  @Field(type => Float)
  allProjectsSum: number;

  @Field(type => Float)
  matchingPool: number;
}
