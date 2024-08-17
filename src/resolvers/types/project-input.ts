import { Field, InputType } from 'type-graphql';
import { FileUpload } from 'graphql-upload/Upload.js';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { MaxLength } from 'class-validator';
import { ProjectSocialMediaInput } from './ProjectVerificationUpdateInput';

import {
  IMAGE_LINK_MAX_SIZE,
  IMPACT_LOCATION_MAX_SIZE,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../../constants/validators';
import { errorMessages } from '../../utils/errorMessages';
@InputType()
export class ImageUpload {
  // Client uploads image file
  @Field(_type => GraphQLUpload, { nullable: true })
  image: FileUpload;

  @Field({ nullable: true })
  projectId?: number;
}

@InputType()
export class ProjectTeamMemberInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  twitter?: string;

  @Field({ nullable: true })
  linkedin?: string;

  @Field({ nullable: true })
  farcaster?: string;
}

@InputType()
export class ProjectInput {
  @Field()
  @MaxLength(PROJECT_TITLE_MAX_LENGTH)
  title: string;

  @Field({ nullable: true })
  adminUserId?: number;

  @Field({ nullable: true })
  @MaxLength(PROJECT_DESCRIPTION_MAX_LENGTH, {
    message: errorMessages.PROJECT_DESCRIPTION_LENGTH_SIZE_EXCEEDED, // It's not propagated to the client!
  })
  description?: string;

  @Field(_type => [String], { nullable: true, defaultValue: [] })
  categories?: string[];

  @Field({ nullable: true })
  @MaxLength(IMAGE_LINK_MAX_SIZE)
  image?: string;

  @Field({ nullable: true })
  @MaxLength(IMAGE_LINK_MAX_SIZE)
  teaser?: string;

  @Field({ nullable: true })
  @MaxLength(IMPACT_LOCATION_MAX_SIZE)
  impactLocation?: string;

  @Field(_type => Boolean, { nullable: true, defaultValue: false })
  isDraft?: boolean;

  @Field({ nullable: true })
  organisationId?: number;

  @Field(() => [ProjectSocialMediaInput], { nullable: true })
  socialMedia?: ProjectSocialMediaInput[];

  @Field(() => [ProjectTeamMemberInput], { nullable: true })
  teamMembers?: ProjectTeamMemberInput[];
}

@InputType()
export class CreateProjectInput extends ProjectInput {
  @Field({ nullable: true })
  address: string;
}

@InputType()
export class UpdateProjectInput extends ProjectInput {
  @Field({ nullable: true })
  address: string;
}
