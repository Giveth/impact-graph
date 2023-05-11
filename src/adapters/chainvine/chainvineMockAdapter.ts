import {
  ChainvineAdapterInterface,
  LinkDonorToChainvineReferrerType,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

export class ChainvineMockAdapter implements ChainvineAdapterInterface {
  private cachedReferralIds = {};
  getWalletAddressFromReferrer(referrerId: string): Promise<string> {
    // Our mock adapter will always return same wallet address for same referrerId
    if (!this.cachedReferralIds[referrerId]) {
      this.cachedReferralIds[referrerId] = generateRandomEtheriumAddress();
    }
    return Promise.resolve(this.cachedReferralIds[referrerId]);
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

  generateChainvineId(walletAddress: string): Promise<string | void> {
    return Promise.resolve(undefined);
  }
}
