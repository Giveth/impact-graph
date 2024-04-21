import { Field, Float, ObjectType } from 'type-graphql';

@ObjectType()
export class EstimatedMatching {
  @Field(_type => Float, { nullable: true })
  projectDonationsSqrtRootSum?: number;

  @Field(_type => Float, { nullable: true })
  allProjectsSum?: number;

  @Field(_type => Float, { nullable: true })
  matchingPool?: number;
}
