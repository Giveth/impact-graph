import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { RelatedAddressInputType } from './ProjectVerificationUpdateInput';

import { FileUpload } from 'graphql-upload/Upload.js';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';

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
  @MaxLength(70)
  title: string;

  @Field({ nullable: true })
  admin?: string;

  @Field({ nullable: true })
  // @Length(0, 2000)
  description?: string;
  // Removing this as rich texts are longer
  // We can consider making this check without img or video tags

  @Field(type => [String], { nullable: true, defaultValue: [] })
  categories?: string[];

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  impactLocation?: string;

  @Field(type => Boolean, { nullable: true, defaultValue: false })
  isDraft?: boolean;

  @Field({ nullable: true })
  organisationId?: number;
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
