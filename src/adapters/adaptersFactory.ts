import { SocialNetworkOauth2AdapterInterface } from './oauth2/SocialNetworkOauth2AdapterInterface.js';
import { DiscordAdapter } from './oauth2/discordAdapter.js';
import { SOCIAL_NETWORKS } from '../entities/socialProfile.js';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages.js';
import { GoogleAdapter } from './oauth2/googleAdapter.js';
import { LinkedinAdapter } from './oauth2/linkedinAdapter.js';
import { TwitterAdapter } from './oauth2/twitterAdapter.js';
import { NotificationAdapterInterface } from './notifications/NotificationAdapterInterface.js';
import { NotificationCenterAdapter } from './notifications/NotificationCenterAdapter.js';
import { MockNotificationAdapter } from './notifications/MockNotificationAdapter.js';
import { GivPowerSubgraphAdapter } from './givpowerSubgraph/givPowerSubgraphAdapter.js';
import { GivPowerSubgraphAdapterMock } from './givpowerSubgraph/givPowerSubgraphAdapterMock.js';
import { ChainvineMockAdapter } from './chainvine/chainvineMockAdapter.js';
import { IGivPowerSubgraphAdapter } from './givpowerSubgraph/IGivPowerSubgraphAdapter.js';
import { GitcoinAdapter } from './gitcoin/gitcoinAdapter.js';
import { GitcoinMockAdapter } from './gitcoin/gitcoinMockAdapter.js';
import { GivPowerBalanceAggregatorAdapter } from './givPowerBalanceAggregator/givPowerBalanceAggregatorAdapter.js';
import { GivPowerBalanceAggregatorAdapterMock } from './givPowerBalanceAggregator/givPowerBalanceAggregatorAdapterMock.js';
import { DonationSaveBackupAdapter } from './donationSaveBackup/donationSaveBackupAdapter.js';
import { DonationSaveBackupMockAdapter } from './donationSaveBackup/DonationSaveBackupMockAdapter.js';
import { SuperFluidAdapter } from './superFluid/superFluidAdapter.js';
import { SuperFluidMockAdapter } from './superFluid/superFluidMockAdapter.js';
import { SuperFluidAdapterInterface } from './superFluid/superFluidAdapterInterface.js';

const discordAdapter = new DiscordAdapter();
const googleAdapter = new GoogleAdapter();
const linkedinAdapter = new LinkedinAdapter();
const twitterAdapter = new TwitterAdapter();

export const getSocialNetworkAdapter = (
  socialNetwork: string,
): SocialNetworkOauth2AdapterInterface => {
  switch (socialNetwork) {
    case SOCIAL_NETWORKS.DISCORD:
      return discordAdapter;
    case SOCIAL_NETWORKS.GOOGLE:
      return googleAdapter;
    case SOCIAL_NETWORKS.LINKEDIN:
      return linkedinAdapter;
    case SOCIAL_NETWORKS.TWITTER:
      return twitterAdapter;
    default:
      throw new Error(
        i18n.__(translationErrorMessagesKeys.INVALID_SOCIAL_NETWORK),
      );
  }
};

const notificationCenterAdapter = new NotificationCenterAdapter();
const mockNotificationAdapter = new MockNotificationAdapter();

export const getNotificationAdapter = (): NotificationAdapterInterface => {
  switch (process.env.NOTIFICATION_CENTER_ADAPTER) {
    case 'notificationCenter':
      return notificationCenterAdapter;
    case 'mock':
      return mockNotificationAdapter;
    default:
      return mockNotificationAdapter;
  }
};

export const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
export const givPowerSubgraphAdapterMock = new GivPowerSubgraphAdapterMock();

export const getGivPowerSubgraphAdapter = (): IGivPowerSubgraphAdapter => {
  switch (process.env.GIV_POWER_SUBGRAPH_ADAPTER) {
    case 'givPower':
      return givPowerSubgraphAdapter;
    case 'mock':
      return givPowerSubgraphAdapterMock;
    default:
      throw new Error(
        i18n.__(translationErrorMessagesKeys.SPECIFY_GIV_POWER_ADAPTER),
      );
  }
};

const mockChainvineAdapter = new ChainvineMockAdapter();

export const getChainvineAdapter = () => {
  switch (process.env.CHAINVINE_ADAPTER) {
    case 'chainvine':
      return mockChainvineAdapter;
    case 'mock':
      return mockChainvineAdapter;
    default:
      return mockChainvineAdapter;
  }
};

const gitcoinAdapter = new GitcoinAdapter();
const mockGitcoinAdapter = new GitcoinMockAdapter();

export const getGitcoinAdapter = () => {
  switch (process.env.GITCOIN_ADAPTER) {
    case 'gitcoin':
      return gitcoinAdapter;
    case 'mock':
      return mockGitcoinAdapter;
    default:
      return mockGitcoinAdapter;
  }
};

export const powerBalanceAggregator = new GivPowerBalanceAggregatorAdapter();
export const mockPowerBalanceAggregator =
  new GivPowerBalanceAggregatorAdapterMock();

export const getPowerBalanceAggregatorAdapter = () => {
  switch (process.env.POWER_BALANCE_AGGREGATOR_ADAPTER) {
    case 'powerBalanceAggregator':
      return powerBalanceAggregator;
    case 'mock':
      return mockPowerBalanceAggregator;
    default:
      return mockPowerBalanceAggregator;
  }
};

const donationSaveBackupAdapter = new DonationSaveBackupAdapter();
const mockDonationSaveBackupAdapter = new DonationSaveBackupMockAdapter();

export const getDonationSaveBackupAdapter = () => {
  switch (process.env.DONATION_SAVE_BACKUP_ADAPTER) {
    case 'saveBackup':
      return donationSaveBackupAdapter;
    case 'mock':
      return mockDonationSaveBackupAdapter;
    default:
      return mockDonationSaveBackupAdapter;
  }
};

const superFluidAdapter = new SuperFluidAdapter();
const superFluidMockAdapter = new SuperFluidMockAdapter();

export const getSuperFluidAdapter = (): SuperFluidAdapterInterface => {
  switch (process.env.SUPER_FLUID_ADAPTER) {
    case 'superfluid':
      return superFluidAdapter;
    case 'mock':
      return superFluidMockAdapter;
    default:
      return superFluidMockAdapter;
  }
};
