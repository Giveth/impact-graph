import { DataSourceOptions } from 'typeorm';
import { Organization } from './organization';
import { Category } from './category';
import { Token } from './token';
import { Donation } from './donation';
import { Wallet } from './wallet';
import { ProjectStatus } from './projectStatus';
import { ProjectImage } from './projectImage';
import { BankAccount, StripeTransaction } from './bankAccount';
import { AccountVerification } from './accountVerification';
import { ProjectStatusReason } from './projectStatusReason';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ThirdPartyProjectImport } from './thirdPartyProjectImport';
import { ProjectVerificationForm } from './projectVerificationForm';
import { ProjectAddress } from './projectAddress';
import { SocialProfile } from './socialProfile';
import { MainCategory } from './mainCategory';
import { User } from './user';
import { Project, ProjectUpdate } from './project';
import { Reaction } from './reaction';
import BroadcastNotification from './broadcastNotification';
import { FeaturedUpdate } from './featuredUpdate';
import { Campaign } from './campaign';
import { QfRound } from './qfRound';
import { ReferredEvent } from './referredEvent';
import { QfRoundHistory } from './qfRoundHistory';
import { ProjectEstimatedMatchingView } from './ProjectEstimatedMatchingView';
import { Sybil } from './sybil';
import { DraftDonation } from './draftDonation';
import { ProjectFraud } from './projectFraud';
import { ProjectActualMatchingView } from './ProjectActualMatchingView';
import { ProjectSocialMedia } from './projectSocialMedia';
import { UserQfRoundModelScore } from './userQfRoundModelScore';
import { UserEmailVerification } from './userEmailVerification';
import { EarlyAccessRound } from './earlyAccessRound';
import { ProjectRoundRecord } from './projectRoundRecord';
import { ProjectUserRecord } from './projectUserRecord';
import { AnkrState } from './ankrState';
import { QaccPointsHistory } from './qaccPointsHistory';

export const getEntities = (): DataSourceOptions['entities'] => {
  return [
    Organization,
    User,
    UserEmailVerification,
    ReferredEvent,
    Project,

    BankAccount,
    StripeTransaction,
    Category,
    ProjectUpdate,
    FeaturedUpdate,
    Reaction,
    Donation,
    DraftDonation,
    Token,
    Wallet,
    ProjectStatus,
    ProjectStatusReason,
    ProjectStatusHistory,
    AccountVerification,
    ProjectImage,
    ThirdPartyProjectImport,
    ProjectVerificationForm,
    ProjectAddress,
    ProjectSocialMedia,
    SocialProfile,
    MainCategory,

    ProjectEstimatedMatchingView,
    ProjectActualMatchingView,

    // historic snapshots
    BroadcastNotification,

    Campaign,

    QfRound,
    QfRoundHistory,
    Sybil,
    ProjectFraud,
    UserQfRoundModelScore,
    EarlyAccessRound,
    ProjectRoundRecord,
    ProjectUserRecord,
    QaccPointsHistory,

    AnkrState,
  ];
};
