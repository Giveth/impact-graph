import { ChainvineAdapterInterface } from './chainvineAdapterInterface';

// Local copies of the test-utils generators: this mock adapter is the only
// production file that needs them, and importing test/testUtils here would
// pull test-only dependencies (chai, sinon) into the production module graph.
function generateHexNumber(len: number): string {
  const hex = '0123456789abcdef';
  let output = '';
  for (let i = 0; i < len; i++) {
    output += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return output;
}

function generateRandomEtheriumAddress(): string {
  return `0x${generateHexNumber(40)}`;
}

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
