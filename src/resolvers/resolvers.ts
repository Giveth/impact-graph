import { UserResolver } from './userResolver';
import { ProjectResolver } from './projectResolver';
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
import { CampaignResolver } from './campaignResolver';
import { ChainvineResolver } from './chainvineResolver';
import { QfRoundResolver } from './qfRoundResolver';
import { QfRoundHistoryResolver } from './qfRoundHistoryResolver';
import { ProjectUserInstantPowerViewResolver } from './instantPowerResolver';

export const getResolvers = (): Function[] => {
  return [
    UserResolver,
    ProjectResolver,
    ChainvineResolver,
    StatusReasonResolver,

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
    ProjectUserInstantPowerViewResolver,

    CampaignResolver,
    QfRoundResolver,
    QfRoundHistoryResolver,
  ];
};
