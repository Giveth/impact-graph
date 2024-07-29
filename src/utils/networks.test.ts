import { assert } from 'chai';
import { detectAddressChainType } from './networks.js';
import { ChainType } from '../types/network.js';

describe('networks - ' + detectAddressChainType.name, () => {
  it('detect solana address - 1', () => {
    assert.equal(
      detectAddressChainType('GEhUKKZeENY1TmaavqvLJ5GbbQs9GkzECFSE2bpjzz3k'),
      ChainType.SOLANA,
    );
  });
});
