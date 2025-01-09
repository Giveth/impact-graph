import { SocialNetworkOauth2AdapterInterface } from './oauth2/SocialNetworkOauth2AdapterInterface';
import { DiscordAdapter } from './oauth2/discordAdapter';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { GoogleAdapter } from './oauth2/googleAdapter';
import { LinkedinAdapter } from './oauth2/linkedinAdapter';
import { TwitterAdapter } from './oauth2/twitterAdapter';
import { NotificationAdapterInterface } from './notifications/NotificationAdapterInterface';
import { NotificationCenterAdapter } from './notifications/NotificationCenterAdapter';
import { MockNotificationAdapter } from './notifications/MockNotificationAdapter';
import { GivPowerSubgraphAdapter } from './givpowerSubgraph/givPowerSubgraphAdapter';
import { GivPowerSubgraphAdapterMock } from './givpowerSubgraph/givPowerSubgraphAdapterMock';
import { ChainvineAdapter } from './chainvine/chainvineAdapter';
import { ChainvineMockAdapter } from './chainvine/chainvineMockAdapter';
import { IGivPowerSubgraphAdapter } from './givpowerSubgraph/IGivPowerSubgraphAdapter';
import { GitcoinAdapter } from './gitcoin/gitcoinAdapter';
import { GitcoinMockAdapter } from './gitcoin/gitcoinMockAdapter';
import { GivPowerBalanceAggregatorAdapter } from './givPowerBalanceAggregator/givPowerBalanceAggregatorAdapter';
import { GivPowerBalanceAggregatorAdapterMock } from './givPowerBalanceAggregator/givPowerBalanceAggregatorAdapterMock';
import { DonationSaveBackupAdapter } from './donationSaveBackup/donationSaveBackupAdapter';
import { DonationSaveBackupMockAdapter } from './donationSaveBackup/DonationSaveBackupMockAdapter';
import { SuperFluidAdapter } from './superFluid/superFluidAdapter';
import { SuperFluidMockAdapter } from './superFluid/superFluidMockAdapter';
import { SuperFluidAdapterInterface } from './superFluid/superFluidAdapterInterface';
import { CocmAdapter } from './cocmAdapter/cocmAdapter';
import { CocmMockAdapter } from './cocmAdapter/cocmMockAdapter';
import { CocmAdapterInterface } from './cocmAdapter/cocmAdapterInterface';

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

const chainvineAdapter = new ChainvineAdapter();
const mockChainvineAdapter = new ChainvineMockAdapter();

export const getChainvineAdapter = () => {
  switch (process.env.CHAINVINE_ADAPTER) {
    case 'chainvine':
      return chainvineAdapter;
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

const clusterMatchingAdapter = new CocmAdapter();
const clusterMatchingMockAdapter = new CocmMockAdapter();

export const getClusterMatchingAdapter = (): CocmAdapterInterface => {
  switch (process.env.CLUSTER_MATCHING_ADAPTER) {
    case 'clusterMatching':
      return clusterMatchingAdapter;
    case 'mock':
      return clusterMatchingMockAdapter;
    default:
      return clusterMatchingMockAdapter;
  }
};
