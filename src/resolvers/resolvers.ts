import { UserResolver } from './userResolver';
import { ProjectResolver } from './projectResolver';
import { NotificationResolver } from './notificationResolver';
import { LoginResolver } from '../user/LoginResolver';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { MeResolver } from '../user/MeResolver';
import { BankAccountResolver } from './bankAccountResolver';
import { UploadResolver } from './uploadResolver';
import { CategoryResolver } from './categoryResolver';
import { DonationResolver } from './donationResolver';
import { ReactionResolver } from './reactionResolver';
import { StatusReasonResolver } from './statusReasonResolver';

export const resolvers: any = [
  UserResolver,
  ProjectResolver,
  StatusReasonResolver,
  NotificationResolver,
  LoginResolver,
  RegisterResolver,
  MeResolver,
  BankAccountResolver,
  UploadResolver,
  CategoryResolver,
  DonationResolver,
  ReactionResolver,
];
