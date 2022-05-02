import { getPoignArtWithdrawals } from './api';
import { assert } from 'chai';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';
import { convertTimeStampToSeconds } from '../../utils/utils';
import axios from 'axios';

describe(
  'getPoignArtWithdrawals() test cases',
  getPoignArtWithdrawalsTestCases,
);

describe('health check test case', healthCheckTestCases);

function getPoignArtWithdrawalsTestCases() {
  const unchainWalletAddress = process.env
    .POIGN_ART_RECIPIENT_ADDRESS as string;
  it('should return result for unchain address', async () => {
    const withdrawals = await getPoignArtWithdrawals({
      recipient: unchainWalletAddress,
      startTimestamp: 0,
    });
    assert.isTrue(withdrawals.length > 0);
    assert.equal(withdrawals[0].recipient, unchainWalletAddress.toLowerCase());
  });
  it('should return empty array for random walletAddress', async () => {
    const withdrawals = await getPoignArtWithdrawals({
      recipient: generateRandomEtheriumAddress(),
      startTimestamp: 0,
    });
    assert.equal(withdrawals.length, 0);
  });

  it('should return empty array for now startTimestamp', async () => {
    const withdrawals = await getPoignArtWithdrawals({
      recipient: unchainWalletAddress,
      startTimestamp: convertTimeStampToSeconds(new Date().getTime()),
    });
    assert.equal(withdrawals.length, 0);
  });
}
function healthCheckTestCases() {
  it('should return empty array for now startTimestamp', async () => {
    const result = await axios.get('http://localhost:4000/health');
    assert.equal(result.data, 'Hii every thing seems ok');
  });
}
