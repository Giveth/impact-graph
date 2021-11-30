import { Length, IsEmail } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { IsEmailAlreadyExist } from './isEmailAlreadyExist';
import { PasswordMixin } from '../../types/PasswordInput';

@InputType()
export class RegisterWalletInput {
  @Field()
  @Length(1, 255)
  firstName?: string;

  @Field()
  @Length(1, 255)
  lastName?: string;

  @Field()
  @Length(1, 255)
  name?: string;

  @Field()
  @Length(1, 255)
  walletAddress?: string;

  @Field()
  @IsEmail()
  @IsEmailAlreadyExist({ message: 'email already in use' })
  email: string;

  @Field()
  organisationId?: number;
}
