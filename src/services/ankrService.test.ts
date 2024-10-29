/* eslint-disable */
import { fetchAnkrTransfers } from './ankrService';

describe.skip('AnkrService', () => {
  it('should return the correct value', async () => {
    const { lastTimeStamp } = await fetchAnkrTransfers({
      addresses: [
        '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
        '0x6C6CD8eD08215120949e057f8D60e33842963beF',
        '0x6E6B4304195FD46c1Cec1F180e5225e7b4351ffF',
        '0xf081470f5C6FBCCF48cC4e5B82Dd926409DcdD67',
      ],
      fromTimestamp: 1730095935,
      transferHandler: transfer => {
        console.log(transfer);
      },
    });
    console.log({ lastTimeStamp });
  });
});
