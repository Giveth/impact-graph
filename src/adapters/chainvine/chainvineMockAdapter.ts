import { ChainvineAdapterInterface } from './chainvineAdapterInterface.js';
import {
  generateRandomEtheriumAddress,
  generateHexNumber,
} from '../../../test/testUtils.js';

export const cachedReferralIds = {};

export class ChainvineMockAdapter implements ChainvineAdapterInterface {
  getWalletAddressFromReferrer(referrerId: string): Promise<string> {
    // Our mock adapter will always return same wallet address for same referrerId
    if (!cachedReferralIds[referrerId]) {
      cachedReferralIds[referrerId] = generateRandomEtheriumAddress();
    }
    return Promise.resolve(cachedReferralIds[referrerId]);
  }

  notifyChainVine(): Promise<void> {
    return Promise.resolve(undefined);
  }

  registerClickEvent(): Promise<void> {
    return Promise.resolve(undefined);
  }

  linkDonorToReferrer(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async generateChainvineId(): Promise<string | void | null> {
    return generateHexNumber(10);
  }
}
