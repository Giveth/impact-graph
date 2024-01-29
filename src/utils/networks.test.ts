import { assert } from 'chai';
import { detectAddressChainType } from './networks';
import { ChainType } from '../types/network';

describe('networks - ' + detectAddressChainType.name, () => {
  it('detect solana address - 1', () => {
    assert.equal(
      detectAddressChainType('GEhUKKZeENY1TmaavqvLJ5GbbQs9GkzECFSE2bpjzz3k'),
      ChainType.SOLANA,
    );
  });
});
