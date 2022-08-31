import { Field, InputType } from 'type-graphql';
import { ProjectContacts } from '../../entities/projectVerificationForm';
import { Column } from 'typeorm';

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
  @Field(type => String, { nullable: true })
  foundationDate?: String;
  @Field({ nullable: true })
  mission?: string;
  @Field({ nullable: true })
  achievedMilestones?: string;
  @Field(type => [String], { nullable: true })
  achievedMilestonesProofs?: string[];
}

@InputType()
class ProjectContactsInputType {
  @Field({ nullable: true })
  name?: string;
  @Field({ nullable: true })
  url?: string;
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
  @Field({ nullable: true })
  organizationName?: string;
  @Field(type => [String], { nullable: true })
  attachments: string[];
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

  @Field(type => [ProjectContactsInputType], { nullable: true })
  projectContacts?: ProjectContactsInputType[];

  @Field({ nullable: true })
  milestones?: MilestonesInputType;

  @Field({ nullable: true })
  managingFunds?: ManagingFundsInputType;

  @Field({ nullable: true })
  isTermAndConditionsAccepted?: boolean;
}
