import { SocialNetworkOauth2AdapterInterface } from './oauth2/SocialNetworkOauth2AdapterInterface';
import { DiscordAdapter } from './oauth2/discordAdapter';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { errorMessages } from '../utils/errorMessages';
import { GoogleAdapter } from './oauth2/googleAdapter';
import { LinkedinAdapter } from './oauth2/linkedinAdapter';
import { TwitterAdapter } from './oauth2/twitterAdapter';
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
      throw new Error(errorMessages.INVALID_SOCIAL_NETWORK);
  }
};

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
const givPowerMockAdapter = new GivPowerSubgraphMock();

export const getGivPowerSubgraphAdapter = () => {
  switch (process.env.GIV_POWER_SUBGRAPH_ADAPTER) {
    case 'giwPower':
      return givPowerSubgraphAdapter;
    case 'mock':
      return givPowerMockAdapter;
    default:
      throw new Error(errorMessages.SPECIFY_GIV_POWER_ADAPTER);
  }
};
