import { assert, expect } from 'chai';
import { fetchMpEthPrice } from './mpEthPriceService.js';

describe('fetchMpEthPrice test cases', fetchMpEthPriceTestCases);

function fetchMpEthPriceTestCases() {
  // MPETH subgraph was not working at the moment of modifying to skip this test
  it.skip('should fetch the price from velodrome subgraph for mpeth', async () => {
    const mpEthPrice = await fetchMpEthPrice();
    assert.isOk(mpEthPrice);
    expect(mpEthPrice).to.gt(0);
  });
}
