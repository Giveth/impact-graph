import { Field, InputType } from 'type-graphql';
import {
  ProjectSocialMediaInput,
  RelatedAddressInputType,
} from './ProjectVerificationUpdateInput';

import { FileUpload } from 'graphql-upload/Upload.js';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import {
  IMAGE_LINK_MAX_SIZE,
  IMPACT_LOCATION_MAX_SIZE,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../../constants/validators';
import { errorMessages } from '../../utils/errorMessages';
import { MaxLength } from 'class-validator';

@InputType()
export class ImageUpload {
  // Client uploads image file
  @Field(type => GraphQLUpload, { nullable: true })
  image: FileUpload;

  @Field({ nullable: true })
  projectId?: number;
}

@InputType()
class ProjectInput {
  @Field()
  @MaxLength(PROJECT_TITLE_MAX_LENGTH)
  title: string;

  @Field({ nullable: true })
  admin?: string;

  @Field({ nullable: true })
  @MaxLength(PROJECT_DESCRIPTION_MAX_LENGTH, {
    message: errorMessages.PROJECT_DESCRIPTION_LENGTH_SIZE_EXCEEDED, // It's not propagated to the client!
  })
  description?: string;

  @Field(type => [String], { nullable: true, defaultValue: [] })
  categories?: string[];

  @Field({ nullable: true })
  @MaxLength(IMAGE_LINK_MAX_SIZE)
  image?: string;

  @Field({ nullable: true })
  @MaxLength(IMPACT_LOCATION_MAX_SIZE)
  impactLocation?: string;

  @Field(type => Boolean, { nullable: true, defaultValue: false })
  isDraft?: boolean;

  @Field({ nullable: true })
  organisationId?: number;

  @Field(() => [ProjectSocialMediaInput], { nullable: true })
  socialMedia?: ProjectSocialMediaInput[];
}

@InputType()
export class CreateProjectInput extends ProjectInput {
  @Field(() => [RelatedAddressInputType], { nullable: true })
  addresses: RelatedAddressInputType[];
}

@InputType()
export class UpdateProjectInput extends ProjectInput {
  @Field(() => [RelatedAddressInputType], { nullable: true })
  addresses?: RelatedAddressInputType[];
}
