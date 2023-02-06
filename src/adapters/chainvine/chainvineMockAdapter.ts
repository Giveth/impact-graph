import {
  ChainvineAdapterInterface,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

export class ChainvineMockAdapter implements ChainvineAdapterInterface {
  private cachedReferralIds = {};
  getWalletAddressFromReferer(referrerId: string): Promise<string> {
    // Our mock adapter will always return same wallet address for same referrerId
    if (!this.cachedReferralIds[referrerId]) {
      this.cachedReferralIds[referrerId] = generateRandomEtheriumAddress();
    }
    return Promise.resolve(this.cachedReferralIds[referrerId]);
  }

  notifyChainVine(params: NotifyChainVineInputType): Promise<void> {
    return Promise.resolve(undefined);
  }
}
