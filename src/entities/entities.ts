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
import { PowerBoosting } from './powerBoosting';
import { UserProjectPowerView } from '../views/userProjectPowerView';
import { PowerRound } from './powerRound';
import { ProjectPowerView } from '../views/projectPowerView';
import { PowerSnapshot } from './powerSnapshot';
import { PowerBalanceSnapshot } from './powerBalanceSnapshot';
import { PowerBoostingSnapshot } from './powerBoostingSnapshot';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { PowerSnapshotHistory } from './powerSnapshotHistory';
import { PowerBalanceSnapshotHistory } from './powerBalanceSnapshotHistory';
import { PowerBoostingSnapshotHistory } from './powerBoostingSnapshotHistory';
import { LastSnapshotProjectPowerView } from '../views/lastSnapshotProjectPowerView';
import { DataSourceOptions } from 'typeorm';
import { User } from './user';
import { Project, ProjectUpdate } from './project';
import { Reaction } from './reaction';
import BroadcastNotification from './broadcastNotification';
import { FeaturedUpdate } from './featuredUpdate';
import { Campaign } from './campaign';
import { PreviousRoundRank } from './previousRoundRank';
import { InstantPowerBalance } from './instantPowerBalance';
import { InstantPowerFetchState } from './instantPowerFetchState';
import { ProjectInstantPowerView } from '../views/projectInstantPowerView';
import { QfRound } from './qfRound';
import { ReferredEvent } from './referredEvent';
import { QfRoundHistory } from './qfRoundHistory';

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
  ];
};
