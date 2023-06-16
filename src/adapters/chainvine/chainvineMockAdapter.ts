import {
  ChainvineAdapterInterface,
  LinkDonorToChainvineReferrerType,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface';
import {
  generateRandomEtheriumAddress,
  generateHexNumber,
} from '../../../test/testUtils';

export const cachedReferralIds = {};

export class ChainvineMockAdapter implements ChainvineAdapterInterface {
  getWalletAddressFromReferrer(referrerId: string): Promise<string> {
    // Our mock adapter will always return same wallet address for same referrerId
    if (!cachedReferralIds[referrerId]) {
      cachedReferralIds[referrerId] = generateRandomEtheriumAddress();
    }
    return Promise.resolve(cachedReferralIds[referrerId]);
  }

  notifyChainVine(params: NotifyChainVineInputType): Promise<void> {
    return Promise.resolve(undefined);
  }

  registerClickEvent(referrerId: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  linkDonorToReferrer(params: LinkDonorToChainvineReferrerType): Promise<void> {
    return Promise.resolve(undefined);
  }

  async generateChainvineId(
    walletAddress: string,
  ): Promise<string | void | null> {
    return generateHexNumber(10);
  }
}
