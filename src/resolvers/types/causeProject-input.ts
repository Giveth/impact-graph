import { Field, InputType, Float } from 'type-graphql';

@InputType()
export class UpdateCauseProjectInput {
  @Field(() => Float)
  causeId: number;

  @Field(() => Float)
  projectId: number;

  @Field(() => Float, { nullable: true })
  amountReceived?: number;

  @Field(() => Float, { nullable: true })
  amountReceivedUsdValue?: number;

  @Field(() => Float, { nullable: true })
  causeScore?: number;
}

@InputType()
export class UpdateCauseProjectDistributionInput {
  @Field(() => Float)
  causeId: number;

  @Field(() => Float)
  projectId: number;

  @Field(() => Float)
  amountReceived: number;

  @Field(() => Float)
  amountReceivedUsdValue: number;
}

@InputType()
export class UpdateCauseProjectEvaluationInput {
  @Field(() => Float)
  causeId: number;

  @Field(() => Float)
  projectId: number;

  @Field(() => Float)
  causeScore: number;
}
