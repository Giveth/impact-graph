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
import { GivPowerSubgraphMock } from './givpowerSubgraph/givPowerSubgraphMock';

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

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
const givPowerMockAdapter = new GivPowerSubgraphMock();

export const getGivPowerSubgraphAdapter = () => {
  switch (process.env.GIV_POWER_SUBGRAPH_ADAPTER) {
    case 'givPower':
      return givPowerSubgraphAdapter;
    case 'mock':
      return givPowerMockAdapter;
    default:
      throw new Error(
        i18n.__(translationErrorMessagesKeys.SPECIFY_GIV_POWER_ADAPTER),
      );
  }
};
