import { Field, Float, ObjectType } from 'type-graphql';

@ObjectType()
export class EstimatedMatching {
  @Field(_type => Float, { nullable: true })
  projectDonationsSqrtRootSum?: number;

  @Field(_type => Float, { nullable: true })
  allProjectsSum?: number;

  @Field(_type => Float, { nullable: true })
  matchingPool?: number;

  @Field(_type => Float, { nullable: true })
  matching?: number;
}

@ObjectType()
export class EstimatedMatchingByQfRound {
  @Field(_type => Float)
  qfRoundId!: number;

  @Field(_type => Float, { nullable: true })
  projectDonationsSqrtRootSum?: number;

  @Field(_type => Float, { nullable: true })
  allProjectsSum?: number;

  @Field(_type => Float, { nullable: true })
  matchingPool?: number;

  @Field(_type => Float, { nullable: true })
  matching?: number;
}
