import { DataSourceOptions } from 'typeorm';
import { Organization } from './organization.js';
import { Category } from './category.js';
import { Token } from './token.js';
import { Donation } from './donation.js';
import { Wallet } from './wallet.js';
import { ProjectStatus } from './projectStatus.js';
import { ProjectImage } from './projectImage.js';
import { BankAccount, StripeTransaction } from './bankAccount.js';
import { AccountVerification } from './accountVerification.js';
import { ProjectStatusReason } from './projectStatusReason.js';
import { ProjectStatusHistory } from './projectStatusHistory.js';
import { ThirdPartyProjectImport } from './thirdPartyProjectImport.js';
import { ProjectVerificationForm } from './projectVerificationForm.js';
import { ProjectAddress } from './projectAddress.js';
import { SocialProfile } from './socialProfile.js';
import { MainCategory } from './mainCategory.js';
import { PowerBoosting } from './powerBoosting.js';
import { UserProjectPowerView } from '../views/userProjectPowerView.js';
import { ProjectUserInstantPowerView } from '../views/projectUserInstantPowerView.js';
import { PowerRound } from './powerRound.js';
import { ProjectPowerView } from '../views/projectPowerView.js';
import { PowerSnapshot } from './powerSnapshot.js';
import { PowerBalanceSnapshot } from './powerBalanceSnapshot.js';
import { PowerBoostingSnapshot } from './powerBoostingSnapshot.js';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView.js';
import { PowerSnapshotHistory } from './powerSnapshotHistory.js';
import { PowerBalanceSnapshotHistory } from './powerBalanceSnapshotHistory.js';
import { PowerBoostingSnapshotHistory } from './powerBoostingSnapshotHistory.js';
import { LastSnapshotProjectPowerView } from '../views/lastSnapshotProjectPowerView.js';
import { User } from './user.js';
import { Project, ProjectUpdate } from './project.js';
import { Reaction } from './reaction.js';
import BroadcastNotification from './broadcastNotification.js';
import { FeaturedUpdate } from './featuredUpdate.js';
import { Campaign } from './campaign.js';
import { PreviousRoundRank } from './previousRoundRank.js';
import { InstantPowerBalance } from './instantPowerBalance.js';
import { InstantPowerFetchState } from './instantPowerFetchState.js';
import { ProjectInstantPowerView } from '../views/projectInstantPowerView.js';
import { QfRound } from './qfRound.js';
import { ReferredEvent } from './referredEvent.js';
import { QfRoundHistory } from './qfRoundHistory.js';
import { ProjectEstimatedMatchingView } from './ProjectEstimatedMatchingView.js';
import { AnchorContractAddress } from './anchorContractAddress.js';
import { RecurringDonation } from './recurringDonation.js';
import { Sybil } from './sybil.js';
import { DraftDonation } from './draftDonation.js';
import { ProjectFraud } from './projectFraud.js';
import { ProjectActualMatchingView } from './ProjectActualMatchingView.js';
import { ProjectSocialMedia } from './projectSocialMedia.js';
import { DraftRecurringDonation } from './draftRecurringDonation.js';

export const getEntities = (): DataSourceOptions['entities'] => {
  return [
    Organization,
    User,
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
    PowerBoosting,
    PowerRound,
    PowerSnapshot,
    PowerBalanceSnapshot,
    PowerBoostingSnapshot,

    // View
    UserProjectPowerView,
    ProjectPowerView,
    ProjectFuturePowerView,
    LastSnapshotProjectPowerView,
    ProjectInstantPowerView,
    ProjectUserInstantPowerView,
    ProjectEstimatedMatchingView,
    ProjectActualMatchingView,

    // historic snapshots
    PowerSnapshotHistory,
    PowerBalanceSnapshotHistory,
    PowerBoostingSnapshotHistory,
    BroadcastNotification,

    Campaign,

    PreviousRoundRank,

    InstantPowerBalance,
    InstantPowerFetchState,

    QfRound,
    QfRoundHistory,
    Sybil,
    ProjectFraud,

    AnchorContractAddress,
    RecurringDonation,
    DraftRecurringDonation,
  ];
};
