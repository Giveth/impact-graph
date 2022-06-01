import { MaxLength, Length } from 'class-validator';
import { InputType, Field } from 'type-graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { RelatedAddressInputType } from './ProjectVerificationUpdateInput';

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

  @Field()
  admin: string;

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
  relatedAddresses: RelatedAddressInputType[];
}

@InputType()
export class UpdateProjectInput extends ProjectInput {
  @Field(() => [RelatedAddressInputType], { nullable: true })
  relatedAddresses?: RelatedAddressInputType[];
}
