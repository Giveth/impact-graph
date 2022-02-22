import { Length, IsEmail } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { IsEmailAlreadyExist } from './isEmailAlreadyExist';
import { PasswordMixin } from '../../types/PasswordInput';
import { GraphQLUpload, FileUpload } from 'graphql-upload';

@InputType()
export class RegisterInput extends PasswordMixin(class {}) {
  @Field()
  @Length(1, 255)
  firstName: string;

  @Field()
  @Length(1, 255)
  lastName: string;

  @Field()
  @IsEmail()
  @IsEmailAlreadyExist({ message: 'email already in use' })
  email: string;
}

export class ProfileImageInput {
  @Field(type => GraphQLUpload, { nullable: false })
  image: FileUpload;
}
