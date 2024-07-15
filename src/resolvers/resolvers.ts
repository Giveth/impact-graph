import { UserResolver } from './userResolver.js';
import { ProjectResolver } from './projectResolver.js';
import { MeResolver } from '../user/MeResolver.js';
import { UploadResolver } from './uploadResolver.js';
import { CategoryResolver } from './categoryResolver.js';
import { DonationResolver } from './donationResolver.js';
import { ReactionResolver } from './reactionResolver.js';
import { StatusReasonResolver } from './statusReasonResolver.js';
import { ProjectVerificationFormResolver } from './projectVerificationFormResolver.js';
import { SocialProfilesResolver } from './socialProfilesResolver.js';
import { PowerBoostingResolver } from './powerBoostingResolver.js';
import { UserProjectPowerResolver } from './userProjectPowerResolver.js';
import { GivPowerTestingResolver } from './givPowerTestingResolver.js';
import { ProjectPowerResolver } from './projectPowerResolver.js';
import { CampaignResolver } from './campaignResolver.js';
import { ChainvineResolver } from './chainvineResolver.js';
import { QfRoundResolver } from './qfRoundResolver.js';
import { QfRoundHistoryResolver } from './qfRoundHistoryResolver.js';
import { ProjectUserInstantPowerViewResolver } from './instantPowerResolver.js';
import { AnchorContractAddressResolver } from './anchorContractAddressResolver.js';
import { RecurringDonationResolver } from './recurringDonationResolver.js';
import { DraftDonationResolver } from './draftDonationResolver.js';
import { OnboardingFormResolver } from './onboardingFormResolver.js';

// eslint-disable-next-line @typescript-eslint/ban-types
export const getResolvers = (): Function[] => {
  return [
    UserResolver,
    ProjectResolver,
    ChainvineResolver,
    StatusReasonResolver,

    MeResolver,
    UploadResolver,
    CategoryResolver,
    DonationResolver,
    DraftDonationResolver,
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

    AnchorContractAddressResolver,
    RecurringDonationResolver,
    OnboardingFormResolver,
  ];
};
