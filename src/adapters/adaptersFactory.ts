import { SocialNetworkOauth2AdapterInterface } from './oauth2/SocialNetworkOauth2AdapterInterface';
import { DiscordAdapter } from './oauth2/discordAdapter';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
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
