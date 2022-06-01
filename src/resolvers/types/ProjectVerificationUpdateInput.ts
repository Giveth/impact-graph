import { Field, InputType } from 'type-graphql';

@InputType()
class ProjectPersonalInfoInputType {
  @Field({ nullable: true })
  fullName?: string;
  @Field({ nullable: true })
  walletAddress?: string;
  @Field({ nullable: true })
  email?: string;
}

@InputType()
class MilestonesInputType {
  @Field({ nullable: true })
  foundationDate?: Date;
  @Field({ nullable: true })
  mission?: string;
  @Field({ nullable: true })
  achievedMilestones?: string;
  @Field({ nullable: true })
  achievedMilestonesProof?: string;
}

@InputType()
class ProjectContactsInputType {
  @Field({ nullable: true })
  twitter?: string;
  @Field({ nullable: true })
  facebook?: string;
  @Field({ nullable: true })
  linkedin?: string;
  @Field({ nullable: true })
  instagram?: string;
  @Field({ nullable: true })
  youtube?: string;
}

@InputType()
export class RelatedAddressInputType {
  @Field({ nullable: true })
  title?: string;
  @Field({ nullable: true })
  address: string;
  @Field({ nullable: true })
  networkId: number;
}

@InputType()
class ManagingFundsInputType {
  @Field({ nullable: true })
  description: string;

  @Field(() => [RelatedAddressInputType], { nullable: true })
  relatedAddresses: RelatedAddressInputType[];
}

@InputType()
class ProjectRegistryInputType {
  @Field({ nullable: true })
  isNonProfitOrganization?: boolean;
  @Field({ nullable: true })
  organizationCountry?: string;
  @Field({ nullable: true })
  organizationWebsite?: string;
  @Field({ nullable: true })
  organizationDescription?: string;
}

@InputType()
export class ProjectVerificationUpdateInput {
  @Field()
  step: string;

  @Field()
  projectVerificationId: number;

  @Field({ nullable: true })
  personalInfo?: ProjectPersonalInfoInputType;

  @Field({ nullable: true })
  projectRegistry?: ProjectRegistryInputType;

  @Field({ nullable: true })
  projectContacts?: ProjectContactsInputType;

  @Field({ nullable: true })
  milestones?: MilestonesInputType;

  @Field({ nullable: true })
  managingFunds?: ManagingFundsInputType;

  @Field({ nullable: true })
  isTermAndConditionsAccepted?: boolean;
}
