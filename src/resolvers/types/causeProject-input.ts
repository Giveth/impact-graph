import { Field, InputType, Float, ObjectType } from 'type-graphql';

@InputType()
export class UpdateCauseProjectInput {
  @Field()
  causeId: number;

  @Field()
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
  @Field()
  causeId: number;

  @Field()
  projectId: number;

  @Field(() => Float)
  amountReceived: number;

  @Field(() => Float)
  amountReceivedUsdValue: number;
}

@InputType()
export class UpdateCauseProjectEvaluationInput {
  @Field()
  causeId: number;

  @Field()
  projectId: number;

  @Field(() => Float)
  causeScore: number;
}

@InputType()
export class FeeBreakdownInput {
  @Field()
  causeId: number;

  @Field(() => Float)
  causeOwnerAmount: number;

  @Field(() => Float)
  causeOwnerAmountUsdValue: number;

  @Field(() => Float)
  givgardenAmount: number;

  @Field(() => Float)
  givgardenAmountUsdValue: number;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => Float)
  totalAmountUsdValue: number;
}

@InputType()
export class CompleteDistributionUpdateInput {
  @Field(() => [UpdateCauseProjectDistributionInput])
  projects: UpdateCauseProjectDistributionInput[];

  @Field(() => FeeBreakdownInput)
  feeBreakdown: FeeBreakdownInput;
}

@ObjectType()
export class CompleteDistributionUpdateResponse {
  @Field()
  success: boolean;
}
