import { assert } from 'chai';
import { detectAddressChainType, isCardanoAddress } from './networks';
import { ChainType } from '../types/network';

describe('networks - ' + detectAddressChainType.name, () => {
  it('detect solana address - 1', () => {
    assert.equal(
      detectAddressChainType('GEhUKKZeENY1TmaavqvLJ5GbbQs9GkzECFSE2bpjzz3k'),
      ChainType.SOLANA,
    );
  });

  it('detects Cardano Shelley mainnet address (addr1...)', () => {
    const addr = 'addr1vyqsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpq3jed';
    assert.isTrue(isCardanoAddress(addr));
    assert.equal(detectAddressChainType(addr), ChainType.CARDANO);
  });

  it('detects Cardano Shelley testnet address (addr_test1...)', () => {
    const addr =
      'addr_test1vqqsqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6g9wkg';
    assert.isTrue(isCardanoAddress(addr));
    assert.equal(detectAddressChainType(addr), ChainType.CARDANO);
  });

  it('rejects Cardano reward (stake) address', () => {
    const stakeAddr =
      'stake1u9g0kz4j7npu4tne3f7w2x9y0r6z5sqh8f0m0x0k4d3l2xq6jgewm';
    assert.isFalse(isCardanoAddress(stakeAddr));
  });

  it('rejects obviously invalid Cardano-like string', () => {
    const bad = 'addr1notrealxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    assert.isFalse(isCardanoAddress(bad));
  });
});
