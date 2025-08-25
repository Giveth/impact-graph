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
import { PowerBoostingResolver } from './powerBoostingResolver';
import { UserProjectPowerResolver } from './userProjectPowerResolver';
import { GivPowerTestingResolver } from './givPowerTestingResolver';
import { ProjectPowerResolver } from './projectPowerResolver';
import { CampaignResolver } from './campaignResolver';
import { ChainvineResolver } from './chainvineResolver';
import { QfRoundResolver } from './qfRoundResolver';
import { QfRoundHistoryResolver } from './qfRoundHistoryResolver';
import { ProjectUserInstantPowerViewResolver } from './instantPowerResolver';
import { AnchorContractAddressResolver } from './anchorContractAddressResolver';
import { RecurringDonationResolver } from './recurringDonationResolver';
import { DraftDonationResolver } from './draftDonationResolver';
import { CardanoDonationResolver } from './cardanoDonationResolver';
import { OnboardingFormResolver } from './onboardingFormResolver';
import { SitemapUrlResolver } from './sitemapUrlResolver';
import { CauseResolver } from './causeResolver';
import { CauseProjectResolver } from './causeProjectResolver';
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
    CardanoDonationResolver,
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

    SitemapUrlResolver,

    CauseResolver,
    CauseProjectResolver,
  ];
};
