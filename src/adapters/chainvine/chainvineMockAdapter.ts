import {
  ChainvineAdapterInterface,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

export class ChainvineMockAdapter implements ChainvineAdapterInterface {
  getWalletAddressFromReferer(referrerId: string): Promise<string> {
    return Promise.resolve(generateRandomEtheriumAddress());
  }

  notifyChainVine(params: NotifyChainVineInputType): Promise<void> {
    return Promise.resolve(undefined);
  }
}
