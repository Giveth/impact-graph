import { UserResolver } from './userResolver';
import { ProjectResolver } from './projectResolver';
import { NotificationResolver } from './notificationResolver';
import { LoginResolver } from '../user/LoginResolver';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { MeResolver } from '../user/MeResolver';
import { UploadResolver } from './uploadResolver';
import { CategoryResolver } from './categoryResolver';
import { DonationResolver } from './donationResolver';
import { ReactionResolver } from './reactionResolver';
import { StatusReasonResolver } from './statusReasonResolver';
import { ProjectVerificationFormResolver } from './projectVerificationFormResolver';
import { SocialProfilesResolver } from './socialProfilesResolver';
import { PowerBoostingResolver } from './powerBoostingResolver';
import { UserProjectPowerResolver } from './userProjectPowerResolver';
import { GivPowerTestingResolver } from './givPowerTestingResolver';
import { ProjectPowerResolver } from './projectPowerResolver';

export const resolvers: any = [
  UserResolver,
  ProjectResolver,
  StatusReasonResolver,
  NotificationResolver,
  LoginResolver,
  RegisterResolver,
  MeResolver,
  UploadResolver,
  CategoryResolver,
  DonationResolver,
  ReactionResolver,
  ProjectVerificationFormResolver,
  SocialProfilesResolver,
  PowerBoostingResolver,
  UserProjectPowerResolver,
  ProjectPowerResolver,
  GivPowerTestingResolver,
];
