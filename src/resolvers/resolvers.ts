import { UserResolver } from './userResolver';
import { ProjectResolver } from './projectResolver';
import { MeResolver } from '../user/MeResolver';
import { UploadResolver } from './uploadResolver';
import { CategoryResolver } from './categoryResolver';
import { DonationResolver } from './donationResolver';
import { ReactionResolver } from './reactionResolver';
import { StatusReasonResolver } from './statusReasonResolver';
import { ProjectVerificationFormResolver } from './projectVerificationFormResolver';
import { SocialProfilesResolver } from './socialProfilesResolver';
import { UserProjectPowerResolver } from './userProjectPowerResolver';
import { CampaignResolver } from './campaignResolver';
import { ChainvineResolver } from './chainvineResolver';
import { QfRoundResolver } from './qfRoundResolver';
import { QfRoundHistoryResolver } from './qfRoundHistoryResolver';
import { ProjectUserInstantPowerViewResolver } from './instantPowerResolver';
import { AnchorContractAddressResolver } from './anchorContractAddressResolver';
import { RecurringDonationResolver } from './recurringDonationResolver';
import { DraftDonationResolver } from './draftDonationResolver';
import { OnboardingFormResolver } from './onboardingFormResolver';

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
    UserProjectPowerResolver,
    ProjectUserInstantPowerViewResolver,

    CampaignResolver,
    QfRoundResolver,
    QfRoundHistoryResolver,

    AnchorContractAddressResolver,
    RecurringDonationResolver,
    OnboardingFormResolver,
  ];
};
