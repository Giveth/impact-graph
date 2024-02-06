import { assert, expect } from 'chai';
import { fetchMpEthPrice } from './mpEthPriceService';

describe('fetchMpEthPrice test cases', fetchMpEthPriceTestCases);

function fetchMpEthPriceTestCases() {
  it('should fetch the price from velodrome subgraph for mpeth', async () => {
    const mpEthPrice = await fetchMpEthPrice();
    assert.isOk(mpEthPrice);
    expect(mpEthPrice).to.gt(0);
  });
}
